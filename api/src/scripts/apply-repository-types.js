// One-off: bring stored crates up to the shape new crates are created with.
import { isDeepStrictEqual } from "node:util";
import lodashPkg from "lodash";
const { castArray, uniq } = lodashPkg;
import models from "../models/index.js";
import { loadConfiguration } from "../common/configuration.js";
import { getStoreHandle } from "../common/getS3Handle.js";
import { indexItem } from "../common/elastic-index.js";
import { getContext, repositoryTypes } from "../lib/crate-tools.js";

main();

async function main() {
    let exitCode = 0;
    try {
        await run({ write: process.argv.includes("--write") });
    } catch (error) {
        console.error(`\nERROR: ${error.message}`);
        exitCode = 1;
    } finally {
        await models.sequelize.close();
    }
    process.exit(exitCode);
}

async function run({ write }) {
    const configuration = await loadConfiguration();
    console.log(write ? "Updating crates" : "Dry run - pass --write to update crates");

    const objects = [
        ...(await models.item.findAll({ attributes: ["identifier"] })).map(({ identifier }) => ({
            location: "workspace",
            type: "item",
            identifier,
        })),
        ...(await models.collection.findAll({ attributes: ["identifier"] })).map(
            ({ identifier }) => ({ location: "workspace", type: "collection", identifier })
        ),
        ...(await models.repoitem.findAll({ attributes: ["identifier", "type"] })).map(
            ({ identifier, type }) => ({ location: "repository", type, identifier })
        ),
    ];

    const counts = { changed: 0, unchanged: 0, failed: 0 };
    for (const object of objects) {
        const label = `${object.location} ${object.type} ${object.identifier}`;
        try {
            const changed = await updateObject({ ...object, configuration, write });
            counts[changed ? "changed" : "unchanged"] += 1;
            if (changed) console.log(`${write ? "updated" : "would update"}: ${label}`);
        } catch (error) {
            counts.failed += 1;
            console.error(`failed: ${label}: ${error.message}`);
        }
    }
    console.log(
        `\n${counts.changed} ${write ? "updated" : "to update"}, ` +
            `${counts.unchanged} already correct, ${counts.failed} failed`
    );
}

async function updateObject({ location, type, identifier, configuration, write }) {
    const store = await getStoreHandle({ id: identifier, type, location });
    if (!(await store.exists())) throw new Error("not in the object store");

    const original = await store.getJSON({ target: "ro-crate-metadata.json" });
    const crate = fixCrate({ crate: structuredClone(original), type });
    if (isDeepStrictEqual(original, crate)) return false;
    if (!write) return true;

    await store.put({ target: "ro-crate-metadata.json", json: crate });
    try {
        await indexItem({ location, configuration, item: { identifier, type }, crate });
    } catch (error) {
        console.error(`reindex failed: ${location} ${type} ${identifier}: ${error.message}`);
    }
    return true;
}

function fixCrate({ crate, type }) {
    crate["@context"] = getContext();

    const descriptor = crate["@graph"].find((e) => e["@id"] === "ro-crate-metadata.json");
    descriptor.conformsTo = { "@id": "https://w3id.org/ro/crate/1.1" };

    const root = crate["@graph"].find((e) => e["@id"] === descriptor.about["@id"]);
    root["@type"] = uniq(["Dataset", ...castArray(root["@type"] ?? []), repositoryTypes[type]]);
    if (root.licence) {
        root.license ??= root.licence;
        delete root.licence;
    }

    for (const entity of crate["@graph"]) {
        const types = castArray(entity["@type"] ?? []);
        if (types.includes("DataReuselicence")) {
            entity["@type"] = types.map((t) => (t === "DataReuselicence" ? "DataReuseLicense" : t));
        }
    }
    return crate;
}
