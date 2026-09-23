import path from "path";
import { parseArgs } from "util";
import rabbit from "foo-foo-mq";
import fsExtraPkg from "fs-extra";
const { readdir } = fsExtraPkg;
import { loadConfiguration } from "/srv/api/src/common/configuration.js";
import models from "/srv/api/src/models/index.js";
import {
    createItem,
    createItemLocationInObjectStore,
    putItemResource,
} from "/srv/api/src/lib/item.js";
import {
    createCollection,
    createCollectionLocationInObjectStore,
} from "/srv/api/src/lib/collection.js";
import { findUserOrCreateAdministrator } from "/srv/api/src/lib/user.js";
import { publishObject, depositObjectIntoRepository } from "/srv/api/src/lib/admin.js";
import { createDefaultROCrateFile } from "/srv/api/src/lib/crate-tools.js";
import { indexItem } from "/srv/api/src/common/elastic-index.js";
import { authorisedUsersFile } from "/srv/api/src/common/index.js";
import { ensureBucket, getStoreHandle } from "/srv/api/src/common/getS3Handle.js";
import { submitTask } from "/srv/api/src/common/task.js";

const testData = "/srv/tasks/src/test-data";
const collectionIdentifier = "SeedCollection";
const austlang = "https://collection.aiatsis.gov.au/austlang/language";

// `metadata` only applies when the item's crate has no description; languages are illustrative.
const seeds = [
    {
        identifier: "Bates34",
        fixture: "Succeeds-ftp-upload/Bates34/Bates34-tei.xml",
        access: "open",
        metadata: { name: "Seed: Daisy Bates papers, section 34", language: "W41" },
    },
    {
        identifier: "Bates35",
        fixture: "Succeeds-ftp-upload/Bates35/Bates35-tei.xml",
        access: "restricted",
        metadata: { name: "Seed: Daisy Bates papers, section 35", language: "W41" },
    },
    {
        identifier: "BM1648A91",
        fixture: "Succeeds-digivol-upload/BM1648A91/BM1648A91-digivol.csv",
        access: "open",
        metadata: { name: "Seed: Buller-Murphy wordlists", language: "W3" },
    },
    {
        identifier: "SLNSW_FL814",
        fixture: "Succeeds-word_doc_upload/SLNSW_FL814/SLNSW_FL814-tei.xml",
        access: "open",
        metadata: { name: "Seed: Word document transcription", language: "D10" },
    },
    {
        identifier: "msword_example",
        fixture: "Succeeds-word_doc_upload/fake-msword-example/msword_example-tei.xml",
        metadata: { name: "Seed: fake MS Word example", language: "L3" },
    },
    {
        identifier: "hw0024",
        fixture: "issue-123-FtP-ingestion-with-people-and-places/hw0024/hw0024-tei.xml",
        access: "open",
        metadata: { name: "Seed: Howitt papers, notes from J. C. McLeod", language: "S49" },
    },
    {
        identifier: "L17L27",
        fixture: "transkribus-ingestion/L17L27/L17L27-tei.xml",
        access: "open",
        metadata: { name: "Seed: Transkribus export", language: "D2" },
    },
    {
        identifier: "SeedImages",
        images: "image-processing",
        metadata: { name: "Seed: page images without transcription", language: "D23" },
    },
];

main().catch(async (error) => {
    console.error(error);
    process.exitCode = 1;
    await shutdown();
});

async function main() {
    const { values } = parseArgs({ options: { email: { type: "string" } } });
    const configuration = await loadConfiguration();
    const email = values.email ?? configuration.api.administrators[0];
    if (!email) throw new Error("No --email given and no administrators configured");

    await models.sequelize.sync();
    await ensureBucket();
    await requireWorker(configuration);
    await connectRabbit(configuration);

    const user = await findUserOrCreateAdministrator({ email, configuration });
    if (!user) {
        throw new Error(`${email} is not a user and isn't in api.administrators`);
    }
    console.log(`Seeding as ${email}`);

    console.log("\nCreating items");
    const tasks = [];
    const items = [];
    for (const seed of seeds) {
        let item = await models.item.findOne({ where: { identifier: seed.identifier } });
        if (!item) item = await createItem({ identifier: seed.identifier, userId: user.id });
        await createItemLocationInObjectStore({ identifier: seed.identifier });
        const submitted = await uploadAndProcess({ configuration, item, seed });
        console.log(`  ${seed.identifier}: ${submitted.length} resource(s) queued for processing`);
        tasks.push(...submitted);
        items.push(item);
    }

    let collection = await models.collection.findOne({
        where: { identifier: collectionIdentifier },
    });
    if (!collection) {
        collection = await createCollection({ identifier: collectionIdentifier, userId: user.id });
    } else {
        await createCollectionLocationInObjectStore({ identifier: collectionIdentifier });
    }
    await collection.addItems(items);

    await waitForTasks(tasks, "processing");

    console.log("\nFilling in missing metadata");
    const updated = [];
    for (const seed of seeds) {
        if (await ensureCrate({ configuration, seed })) updated.push(seed.identifier);
    }
    await ensureCrate({
        configuration,
        seed: {
            identifier: collectionIdentifier,
            type: "collection",
            metadata: { name: "Seed collection" },
        },
    });

    console.log("\nAssembling TEI documents");
    const assembly = [];
    for (const [index, seed] of seeds.entries()) {
        if (seed.images) continue;
        const store = await getStoreHandle({ id: seed.identifier, type: "item" });
        const assembled = await store.fileExists({ path: `${seed.identifier}-tei-complete.xml` });
        if (assembled && !updated.includes(seed.identifier)) continue;
        assembly.push(
            await submit({ configuration, item: items[index], name: "assemble-tei-document" }),
        );
    }
    await waitForTasks(assembly, "TEI assembly");

    console.log("\nIndexing and publishing");
    for (const [index, seed] of seeds.entries()) {
        if (seed.access && user.administrator) {
            await publish({ configuration, item: items[index], access: seed.access, email });
        } else {
            await indexWorkspace({ configuration, identifier: seed.identifier, type: "item" });
            console.log(`  ${seed.identifier}: indexed (workspace only)`);
        }
    }
    await indexWorkspace({ configuration, identifier: collectionIdentifier, type: "collection" });
    if (!user.administrator) console.log(`  ${email} isn't an administrator: nothing published`);

    await shutdown();
    console.log("\nDone");
}

// Resources whose output isn't in the store are (re)processed, so dropped or failed work is retried.
async function uploadAndProcess({ configuration, item, seed }) {
    const { identifier } = item;
    const store = await getStoreHandle({ id: identifier, type: "item" });
    const existing = (await store.listResources()).map((r) => r.Key);
    const resources = [];
    if (seed.fixture) {
        const resource = path.basename(seed.fixture);
        const name = resource.endsWith("-digivol.csv") ? "process-digivol" : "process-tei";
        const page = new RegExp(`^${identifier}-.+\\.tei\\.xml$`);
        const processed = existing.some((key) => page.test(key));
        resources.push({ resource, name, processed, localPath: path.join(testData, seed.fixture) });
    }
    if (seed.images) {
        const images = (await readdir(path.join(testData, seed.images))).sort();
        for (const [index, image] of images.entries()) {
            const page = `${identifier}-${String(index + 1).padStart(3, "0")}`;
            resources.push({
                resource: `${page}${path.extname(image)}`,
                name: "process-image-without-ocr",
                processed: existing.includes(`${page}.webp`),
                localPath: path.join(testData, seed.images, image),
            });
        }
    }

    const tasks = [];
    for (const { resource, name, processed, localPath } of resources) {
        if (processed) continue;
        await putItemResource({ identifier, resource, localPath });
        tasks.push(await submit({ configuration, item, resource, name }));
    }
    return tasks;
}

async function ensureCrate({ configuration, seed }) {
    const { identifier, type = "item", metadata } = seed;
    const store = await getStoreHandle({ id: identifier, type });
    let crate;
    try {
        crate = await store.getJSON({ target: "ro-crate-metadata.json" });
    } catch (error) {
        crate = createDefaultROCrateFile({ name: identifier });
    }
    const root = crate["@graph"].find((entity) => entity["@id"] === "./");
    root.identifier = identifier;

    if (!root.description && metadata) {
        root.name = metadata.name;
        root.description = `Dummy ${type} created by tasks/seed.js for development and testing.`;
        if (metadata.language) {
            const entities = await lookupLanguage({ configuration, code: metadata.language });
            root.contentLanguage = { "@id": entities[0]["@id"] };
            const ids = entities.map((entity) => entity["@id"]);
            crate["@graph"] = [
                ...crate["@graph"].filter((entity) => !ids.includes(entity["@id"])),
                ...entities,
            ];
        }
        console.log(`  ${identifier}: added seed metadata`);
        await store.put({ target: "ro-crate-metadata.json", json: crate });
        return true;
    }
    await store.put({ target: "ro-crate-metadata.json", json: crate });
    return false;
}

async function lookupLanguage({ configuration, code }) {
    const id = `${austlang}/${code}`;
    const response = await fetch(
        `${configuration.api.services.elastic.host}/data/_doc/${encodeURIComponent(id)}`,
    );
    if (!response.ok) throw new Error(`Language ${code} not found: run npm run load:datapacks`);
    const { geo, ...language } = (await response.json())._source;
    if (!geo) return [language];
    return [{ ...language, geo: { "@id": geo["@id"] } }, geo];
}

async function publish({ configuration, item, access, email }) {
    const { identifier } = item;
    const store = await getStoreHandle({ id: identifier, type: "item" });
    item.publicationStatus = "awaitingReview";
    item.publicationMetadata = {
        accessType: access,
        accessControlList: access === "open" ? [] : [email],
        accessNarrative: {
            text: access === "open" ? undefined : "Seed data: restricted to the seeding user.",
        },
    };
    await item.save();
    if (access === "open") {
        await store.delete({ target: authorisedUsersFile });
    } else {
        await store.put({ target: authorisedUsersFile, json: [email] });
    }

    await publishObject({ user: { administrator: true }, type: "item", identifier, configuration });
    await depositObjectIntoRepository({ configuration, type: "item", identifier });

    const repoitem = await models.repoitem.findOne({ where: { identifier, type: "item" } });
    if (repoitem?.openAccess !== (access === "open")) {
        throw new Error(`${identifier}: deposit didn't record the expected access (${access})`);
    }
    console.log(`  ${identifier}: indexed and published (${access})`);
}

async function indexWorkspace({ configuration, identifier, type }) {
    const store = await getStoreHandle({ id: identifier, type });
    const crate = await store.getJSON({ target: "ro-crate-metadata.json" });
    await indexItem({ configuration, item: { identifier, type }, crate });
}

async function waitForTasks(tasks, label) {
    if (!tasks.length) return;
    const ids = tasks.map((task) => task.id);
    console.log(`\nWaiting for ${ids.length} ${label} task(s)`);
    const deadline = Date.now() + 20 * 60 * 1000;
    for (;;) {
        const rows = await models.task.findAll({ where: { id: ids } });
        const pending = rows.filter((row) => row.status === "in progress");
        if (!pending.length) {
            const failed = rows.filter((row) => row.status === "failed");
            if (failed.length) {
                const names = failed.map((row) => `${row.name} ${row.resource ?? ""}`.trim());
                throw new Error(`${label} failed: ${names.join(", ")}`);
            }
            return;
        }
        if (Date.now() > deadline) {
            throw new Error(`Timed out waiting for ${label}: is rabbit-worker1 running?`);
        }
        await new Promise((resolve) => setTimeout(resolve, 2000));
    }
}

async function submit({ configuration, item, resource, name }) {
    return await submitTask({ rabbit, configuration, item: item.get(), name, body: { resource } });
}

// The task queue is auto-deleted while no worker is attached, so anything published then is lost.
async function requireWorker(configuration) {
    const { host, user, pass, queues } = configuration.api.services.rabbit;
    const queue = queues[0].name;
    const response = await fetch(`http://${host}:15672/api/queues/%2f/${queue}`, {
        headers: { authorization: `Basic ${Buffer.from(`${user}:${pass}`).toString("base64")}` },
    });
    const consumers = response.ok ? (await response.json()).consumers : 0;
    if (!consumers) throw new Error(`No worker is consuming '${queue}': is rabbit-worker1 up?`);
}

async function connectRabbit(configuration) {
    const { host, port, user, pass, exchanges } = configuration.api.services.rabbit;
    // Publish only: declaring the worker's queue here would make this script a consumer.
    await rabbit.configure({
        connection: { name: "default", user, pass, host, port, vhost: "%2f" },
        exchanges,
    });
}

async function shutdown() {
    await rabbit.shutdown();
    await models.sequelize.close();
}
