import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { Op } from "sequelize";
import models from "../models/index.js";
import { loadConfiguration } from "../common/configuration.js";
import { getStoreHandle } from "../common/getS3Handle.js";
import { authorisedUsersFile } from "../common/index.js";

const mergeableFields = ["upload", "administrator", "locked", "givenName", "familyName", "data"];
const objectStoreLocations = ["workspace", "repository"];

let rl;

main();

async function main() {
    let exitCode = 0;
    try {
        if (!input.isTTY) {
            throw new Error(
                `This script is interactive - run it with a terminal attached (docker compose exec ...)`
            );
        }
        rl = readline.createInterface({ input, output });
        await run();
    } catch (error) {
        console.error(`\nERROR: ${error.message}`);
        exitCode = 1;
    } finally {
        rl?.close();
        await models.sequelize.close();
    }
    process.exit(exitCode);
}

async function run() {
    const emails = process.argv.slice(2);
    if (emails.length !== 2) {
        throw new Error(`Usage: node src/scripts/merge-users.js <email> <email>`);
    }
    if (emails[0].toLowerCase() === emails[1].toLowerCase()) {
        throw new Error(`Both addresses are the same`);
    }

    const configuration = await loadConfiguration();
    const administrators = configuration.api.administrators ?? [];

    let accounts = [];
    for (let email of emails) {
        accounts.push(await describeAccount({ email, administrators }));
    }

    const sharedItems = intersection(accounts[0].items, accounts[1].items);
    const sharedCollections = intersection(accounts[0].collections, accounts[1].collections);

    for (let [index, account] of accounts.entries()) {
        printAccount({ account, index, sharedItems, sharedCollections });
    }

    const choice = await ask({
        question: `Which account survives? [1/2]`,
        valid: ["1", "2"],
    });
    const survivor = accounts[Number(choice) - 1];
    const loser = accounts[Number(choice) === 1 ? 1 : 0];

    if (administrators.includes(loser.user.email)) {
        throw new Error(
            `'${loser.user.email}' is listed in api.administrators in the configuration file. ` +
                `Deleting the account would achieve nothing - it is recreated on next login. ` +
                `Remove the address from the configuration first.`
        );
    }

    console.log(`\nProbing the object store for access control list files ...`);
    const objectStoreTargets = await findObjectStoreAcls({
        candidates: loser.acl,
        email: loser.user.email,
    });
    console.log(`  found ${objectStoreTargets.length}`);

    const attributes = await resolveAttributes({ survivor, loser });

    printPlan({ survivor, loser, attributes, sharedItems, sharedCollections, objectStoreTargets });

    const confirmation = await rl.question(`\nType MERGE to proceed, anything else to abort: `);
    if (confirmation !== "MERGE") {
        console.log(`\nAborted - nothing has been changed.`);
        return;
    }

    console.log(`\nRewriting access control lists in the object store ...`);
    const objectStoreUpdates = await rewriteObjectStoreAcls({
        targets: objectStoreTargets,
        from: loser.user.email,
        to: survivor.user.email,
    });
    objectStoreUpdates.forEach((target) => console.log(`  updated ${target}`));
    if (!objectStoreUpdates.length) console.log(`  nothing to do`);

    const snapshot = {
        mergedAt: new Date().toISOString(),
        survivor: { id: survivor.user.id, email: survivor.user.email },
        deleted: survivor.user.get ? loser.user.get() : loser.user,
        attributeChanges: attributes,
        moved: {
            items: loser.items.filter((identifier) => !sharedItems.includes(identifier)),
            collections: loser.collections.filter(
                (identifier) => !sharedCollections.includes(identifier)
            ),
            duplicateItemGrantsDropped: sharedItems,
            duplicateCollectionGrantsDropped: sharedCollections,
        },
        accessControlListUpdates: {
            database: loser.acl.map((entry) => `${entry.source}:${entry.type}/${entry.identifier}`),
            objectStore: objectStoreUpdates,
        },
    };

    const expected = {
        items: unique([...survivor.items, ...loser.items]).sort(),
        collections: unique([...survivor.collections, ...loser.collections]).sort(),
    };

    console.log(`\nApplying database changes ...`);
    await models.sequelize.transaction(async (transaction) => {
        await assertNothingDrifted({ survivor, loser, transaction });

        await moveGrants({
            association: models.user.associations.items,
            survivor: survivor.user,
            loser: loser.user,
            transaction,
        });
        await moveGrants({
            association: models.user.associations.collections,
            survivor: survivor.user,
            loser: loser.user,
            transaction,
        });
        await rewriteDatabaseAcls({
            entries: loser.acl,
            from: loser.user.email,
            to: survivor.user.email,
            transaction,
        });

        if (Object.keys(attributes).length) {
            await models.user.update(attributes, { where: { id: survivor.user.id }, transaction });
        }

        const userIds = [survivor.user.id, loser.user.id];
        await models.session.destroy({ where: { userId: userIds }, transaction });
        await models.otp.destroy({ where: { userId: userIds }, transaction });

        await models.log.create(
            {
                level: "info",
                owner: survivor.user.email,
                text: `Merged account '${loser.user.email}' into '${survivor.user.email}'`,
                data: snapshot,
            },
            { transaction }
        );

        await models.user.destroy({ where: { id: loser.user.id }, transaction });
    });

    const passed = await verifyMerge({ survivor, loser, expected, objectStoreTargets, attributes });

    console.log(`\n${JSON.stringify(snapshot, null, 2)}`);

    if (!passed) {
        throw new Error(
            `The merge was applied but the checks above did not all pass. The database changes ` +
                `were committed - use the snapshot printed above to work out what to repair.`
        );
    }
    console.log(`\nDone. '${loser.user.email}' has been merged into '${survivor.user.email}'.`);
    console.log(`Both users must log in again.`);
}

async function assertNothingDrifted({ survivor, loser, transaction }) {
    for (let account of [survivor, loser]) {
        const user = await models.user.findOne({
            where: { id: account.user.id },
            transaction,
            lock: transaction.LOCK.UPDATE,
        });
        if (!user) {
            throw new Error(`'${account.user.email}' disappeared while you were deciding - aborted`);
        }
        const items = (await user.getItems({ attributes: ["identifier"], transaction }))
            .map((i) => i.identifier)
            .sort();
        const collections = (await user.getCollections({ attributes: ["identifier"], transaction }))
            .map((c) => c.identifier)
            .sort();

        if (items.join() !== account.items.join() || collections.join() !== account.collections.join()) {
            throw new Error(
                `The grants held by '${account.user.email}' changed while you were deciding - ` +
                    `aborted without applying any database changes. Run the script again.`
            );
        }
    }
}

async function verifyMerge({ survivor, loser, expected, objectStoreTargets, attributes }) {
    console.log(`\nVerifying ...`);
    let passed = true;

    const check = (description, ok, detail) => {
        console.log(`  ${ok ? "OK  " : "FAIL"} ${description}${detail ? ` - ${detail}` : ""}`);
        if (!ok) passed = false;
    };

    const deleted = await models.user.findOne({ where: { id: loser.user.id } });
    check(`'${loser.user.email}' no longer exists`, !deleted);

    const user = await models.user.findOne({ where: { id: survivor.user.id } });
    check(`'${survivor.user.email}' still exists`, !!user);

    if (user) {
        const items = (await user.getItems({ attributes: ["identifier"] }))
            .map((i) => i.identifier)
            .sort();
        const collections = (await user.getCollections({ attributes: ["identifier"] }))
            .map((c) => c.identifier)
            .sort();

        check(
            `survivor holds all ${expected.items.length} item grant(s)`,
            items.join() === expected.items.join(),
            items.join() === expected.items.join() ? null : `got ${items.join(", ")}`
        );
        check(
            `survivor holds all ${expected.collections.length} collection grant(s)`,
            collections.join() === expected.collections.join(),
            collections.join() === expected.collections.join()
                ? null
                : `got ${collections.join(", ")}`
        );
        check(
            `no duplicate item grants`,
            items.length === unique(items).length
        );
        check(
            `no duplicate collection grants`,
            collections.length === unique(collections).length
        );

        for (let [field, value] of Object.entries(attributes)) {
            check(`survivor ${field} is ${serialise(value)}`, serialise(user[field]) === serialise(value));
        }
    }

    const remaining = await findAclEntries({ email: loser.user.email });
    check(
        `no database access control list names '${loser.user.email}'`,
        !remaining.length,
        remaining.length ? remaining.map((e) => `${e.source}:${e.identifier}`).join(", ") : null
    );

    for (let target of objectStoreTargets) {
        const store = await getStoreHandle({
            identifier: target.identifier,
            type: target.type,
            location: target.location,
        });
        const acl = await store.getJSON({ target: authorisedUsersFile });
        const ok =
            Array.isArray(acl) &&
            !acl.includes(loser.user.email) &&
            acl.includes(survivor.user.email);
        check(`${describeTarget(target)} names the survivor`, ok, ok ? null : JSON.stringify(acl));
    }

    const sessions = await models.session.count({
        where: { userId: [survivor.user.id, loser.user.id] },
    });
    check(`no sessions remain for either account`, sessions === 0);

    const audit = await models.log.count({
        where: { owner: survivor.user.email, text: `Merged account '${loser.user.email}' into '${survivor.user.email}'` },
    });
    check(`the audit log entry was written`, audit === 1);

    return passed;
}

async function describeAccount({ email, administrators }) {
    const user = await models.user.findOne({ where: { email } });
    if (!user) throw new Error(`No account found for '${email}'`);

    const items = (await user.getItems({ attributes: ["identifier"] })).map((i) => i.identifier);
    const collections = (await user.getCollections({ attributes: ["identifier"] })).map(
        (c) => c.identifier
    );

    return {
        user,
        items: items.sort(),
        collections: collections.sort(),
        logCount: await models.log.count({ where: { owner: email } }),
        acl: await findAclEntries({ email }),
        isConfiguredAdministrator: administrators.includes(email),
    };
}

async function findAclEntries({ email }) {
    let entries = [];

    for (let type of ["item", "collection"]) {
        let rows = await models[type].findAll({
            where: { publicationMetadata: { [Op.ne]: null } },
            attributes: ["id", "identifier", "publicationMetadata"],
        });
        for (let row of rows) {
            let acl = row.publicationMetadata?.accessControlList;
            if (Array.isArray(acl) && acl.includes(email)) {
                entries.push({
                    source: "publicationMetadata",
                    type,
                    id: row.id,
                    identifier: row.identifier,
                });
            }
        }
    }

    let repoitems = await models.repoitem.findAll({
        where: { accessControlList: { [Op.ne]: null } },
        attributes: ["id", "identifier", "type", "accessControlList"],
    });
    for (let row of repoitems) {
        if (Array.isArray(row.accessControlList) && row.accessControlList.includes(email)) {
            entries.push({
                source: "repoitem",
                type: row.type,
                id: row.id,
                identifier: row.identifier,
            });
        }
    }

    return entries;
}

function printAccount({ account, index, sharedItems, sharedCollections }) {
    const user = account.user;
    console.log(`\n${"=".repeat(78)}`);
    console.log(`[${index + 1}] ${user.email}`);
    console.log(`${"=".repeat(78)}`);
    console.log(`  id             ${user.id}`);
    console.log(`  provider       ${user.provider}`);
    console.log(`  identifier     ${user.identifier ?? "-"}`);
    console.log(`  name           ${[user.givenName, user.familyName].filter(Boolean).join(" ")}`);
    console.log(`  created        ${user.createdAt.toISOString()}`);
    console.log(`  locked         ${user.locked}`);
    console.log(`  upload         ${user.upload}`);
    console.log(`  administrator  ${user.administrator}`);
    console.log(`  data           ${user.data ? JSON.stringify(user.data) : "-"}`);
    console.log(`  in admin list  ${account.isConfiguredAdministrator}`);
    console.log(`  log entries    ${account.logCount}`);

    printList({ label: `items (${account.items.length})`, values: account.items, shared: sharedItems });
    printList({
        label: `collections (${account.collections.length})`,
        values: account.collections,
        shared: sharedCollections,
    });

    console.log(`\n  access control list entries naming this address (${account.acl.length}):`);
    if (!account.acl.length) console.log(`    -`);
    for (let entry of account.acl) {
        console.log(`    ${entry.source} ${entry.type}/${entry.identifier}`);
    }
}

function printList({ label, values, shared }) {
    console.log(`\n  ${label}:`);
    if (!values.length) console.log(`    -`);
    for (let value of values) {
        console.log(`    ${value}${shared.includes(value) ? "  (shared)" : ""}`);
    }
}

async function resolveAttributes({ survivor, loser }) {
    let attributes = {};

    for (let field of mergeableFields) {
        const keep = survivor.user[field];
        const other = loser.user[field];
        if (serialise(keep) === serialise(other)) continue;

        const recommendation = recommend({ field, keep, other });
        console.log(`\n${"-".repeat(78)}`);
        console.log(`${field} differs`);
        console.log(`  [s] ${survivor.user.email} (survivor): ${serialise(keep)}`);
        console.log(`  [l] ${loser.user.email}: ${serialise(other)}`);
        const answer = await ask({
            question: `  Which value should the surviving account have? [s/l] (default ${recommendation})`,
            valid: ["s", "l", ""],
        });
        const chosen = (answer || recommendation) === "s" ? keep : other;
        if (serialise(chosen) !== serialise(keep)) attributes[field] = chosen;
    }

    return attributes;
}

function recommend({ field, keep, other }) {
    switch (field) {
        case "upload":
        case "administrator":
            return keep || other ? (keep ? "s" : "l") : "s";
        case "locked":
            return "s";
        case "givenName":
        case "familyName":
            return keep ? "s" : "l";
        default:
            return "s";
    }
}

function printPlan({ survivor, loser, attributes, sharedItems, sharedCollections, objectStoreTargets }) {
    console.log(`\n${"#".repeat(78)}`);
    console.log(`PLAN`);
    console.log(`${"#".repeat(78)}`);
    console.log(`\n  SURVIVES  ${survivor.user.email}  (${survivor.user.id})`);
    console.log(`  DELETED   ${loser.user.email}  (${loser.user.id})`);

    const movedItems = loser.items.filter((identifier) => !sharedItems.includes(identifier));
    const movedCollections = loser.collections.filter(
        (identifier) => !sharedCollections.includes(identifier)
    );

    console.log(`\n  ${movedItems.length} item grant(s) move to the survivor:`);
    movedItems.forEach((identifier) => console.log(`    ${identifier}`));
    console.log(`\n  ${movedCollections.length} collection grant(s) move to the survivor:`);
    movedCollections.forEach((identifier) => console.log(`    ${identifier}`));

    const duplicates = sharedItems.filter((i) => loser.items.includes(i));
    const duplicateCollections = sharedCollections.filter((c) => loser.collections.includes(c));
    console.log(
        `\n  ${duplicates.length + duplicateCollections.length} duplicate grant(s) dropped ` +
            `(the survivor already has access)`
    );

    console.log(`\n  ${loser.acl.length} database access control list(s) rewritten to the survivor:`);
    if (!loser.acl.length) console.log(`    -`);
    for (let entry of loser.acl) {
        console.log(`    ${entry.source} ${entry.type}/${entry.identifier}`);
    }

    console.log(`\n  ${objectStoreTargets.length} object store file(s) rewritten to the survivor:`);
    if (!objectStoreTargets.length) console.log(`    -`);
    for (let target of objectStoreTargets) {
        console.log(`    ${describeTarget(target)}`);
        console.log(`      ${JSON.stringify(target.acl)}`);
    }

    console.log(`\n  attribute changes to the survivor:`);
    if (!Object.keys(attributes).length) console.log(`    none`);
    for (let [field, value] of Object.entries(attributes)) {
        console.log(`    ${field}: ${serialise(survivor.user[field])} -> ${serialise(value)}`);
    }

    console.log(`\n  logs.owner history is left untouched (${loser.logCount} entries)`);
    console.log(`  both accounts' sessions and one time passwords are destroyed`);
}

async function findObjectStoreAcls({ candidates, email }) {
    let targets = [];
    const objects = uniqueBy(
        candidates.map(({ identifier, type }) => ({ identifier, type })),
        (object) => `${object.type}/${object.identifier}`
    );

    for (let object of objects) {
        for (let location of objectStoreLocations) {
            const store = await getStoreHandle({
                identifier: object.identifier,
                type: object.type,
                location,
            });
            if (!(await store.exists())) continue;
            if (!(await store.fileExists({ path: authorisedUsersFile }))) continue;

            const acl = await store.getJSON({ target: authorisedUsersFile });
            if (!Array.isArray(acl) || !acl.includes(email)) continue;

            targets.push({ ...object, location, acl });
        }
    }

    return targets;
}

async function rewriteObjectStoreAcls({ targets, from, to }) {
    let updated = [];

    for (let target of targets) {
        const store = await getStoreHandle({
            identifier: target.identifier,
            type: target.type,
            location: target.location,
        });

        // re-read rather than trusting the probe, in case it changed in between
        const acl = await store.getJSON({ target: authorisedUsersFile });
        const result = rewriteAcl({ acl, from, to });
        if (!result.changed) {
            console.log(`  skipped ${describeTarget(target)} - no longer names '${from}'`);
            continue;
        }

        await store.put({ target: authorisedUsersFile, json: result.acl });
        updated.push(describeTarget(target));
    }

    return updated;
}

function describeTarget({ location, type, identifier }) {
    return `${location}/${type}/${identifier}/${authorisedUsersFile}`;
}

async function rewriteDatabaseAcls({ entries, from, to, transaction }) {
    for (let entry of entries) {
        if (entry.source === "publicationMetadata") {
            const row = await models[entry.type].findOne({ where: { id: entry.id }, transaction });
            const result = rewriteAcl({
                acl: row.publicationMetadata?.accessControlList,
                from,
                to,
            });
            if (!result.changed) continue;
            row.publicationMetadata = {
                ...row.publicationMetadata,
                accessControlList: result.acl,
            };
            await row.save({ transaction });
        } else {
            const row = await models.repoitem.findOne({ where: { id: entry.id }, transaction });
            const result = rewriteAcl({ acl: row.accessControlList, from, to });
            if (!result.changed) continue;
            row.accessControlList = result.acl;
            await row.save({ transaction });
        }
    }
}

function rewriteAcl({ acl, from, to }) {
    if (!Array.isArray(acl) || !acl.includes(from)) return { changed: false, acl };
    let updated = acl.filter((entry) => entry !== from);
    if (!updated.includes(to)) updated.push(to);
    return { changed: true, acl: updated };
}

async function moveGrants({ association, survivor, loser, transaction }) {
    const through = association.through.model;
    const userKey = association.foreignKey;
    const targetKey = association.otherKey;

    const held = await through.findAll({ where: { [userKey]: survivor.id }, transaction });
    const heldIds = held.map((row) => row[targetKey]);

    if (heldIds.length) {
        await through.destroy({
            where: { [userKey]: loser.id, [targetKey]: { [Op.in]: heldIds } },
            transaction,
        });
    }
    await through.update(
        { [userKey]: survivor.id },
        { where: { [userKey]: loser.id }, transaction }
    );
}

async function ask({ question, valid }) {
    while (true) {
        const answer = (await rl.question(`${question}: `)).trim().toLowerCase();
        if (valid.includes(answer)) return answer;
        console.log(`  Please answer one of: ${valid.filter(Boolean).join(", ")}`);
    }
}

function intersection(a, b) {
    return a.filter((value) => b.includes(value));
}

function unique(values) {
    return [...new Set(values)];
}

function uniqueBy(values, key) {
    const seen = new Set();
    return values.filter((value) => {
        const k = key(value);
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
    });
}

function serialise(value) {
    if (value === null || value === undefined) return "-";
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
}
