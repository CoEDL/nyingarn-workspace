import { demandAuthenticatedUser, getStoreHandle, loadProfile } from "../common/index.js";
import lodashPkg from "lodash";
const { uniqBy, compact, flattenDeep } = lodashPkg;
import models from "../models/index.js";
import { createDefaultROCrateFile } from "../lib/crate-tools.js";
import { ROCrate } from "ro-crate";

export function setupRoutes(fastify, options, done) {
    fastify.addHook("preHandler", demandAuthenticatedUser);

    fastify.post("/describo/link", postLinkItemsHandler);
    fastify.post("/describo/unlink", postUnlinkItemsHandler);
    fastify.post("/describo/copy", postCopyCrateHandler);
    fastify.get("/describo/rocrate/:type/:identifier", getDescriboROCrate);
    fastify.put("/describo/rocrate/:type/:identifier", putDescriboROCrate);
    fastify.get("/describo/profile/:type", getDescriboProfile);
    done();
}

function assembleUrl({ targetType, identifier }) {
    if (targetType === "collection") {
        return `https://catalog.nyingarn.net/collections/${identifier}`;
    } else if (targetType === "item") {
        return `https://catalog.nyingarn.net/items/${identifier}`;
    }
}
// TODO: this code does not have tests
async function postLinkItemsHandler(req) {
    const updates = req.body.updates;

    // add the database link between source and target
    let source = await models[updates[0].sourceType].findOne({
        where: { identifier: updates[0].source },
    });
    let target = await models[updates[0].targetType].findOne({
        where: { identifier: updates[0].target },
    });
    if (updates[0].sourceType === "item") {
        await source.addCollection(target);
    } else if (updates[0].sourceType === "collection" && updates[0].targetType === "collection") {
        await source.addSubCollection(target);
        await target.addSubCollection(source);
    } else if (updates[0].sourceType === "collection" && updates[0].targetType === "item") {
        await source.addItem(target);
    }

    for (let update of req.body.updates) {
        const id = assembleUrl({ targetType: update.targetType, identifier: update.target });

        let store = await getStoreHandle({ id: update.source, type: update.sourceType });
        let crate;
        try {
            crate = await store.getJSON({ target: "ro-crate-metadata.json" });
        } catch (error) {
            crate = createDefaultROCrateFile({ name: update.source });
            await store.put({ json: crate, target: "ro-crate-metadata.json" });
        }
        let rootDescriptor = crate["@graph"].filter(
            (e) => e["@id"] === "ro-crate-metadata.json" && e["@type"] === "CreativeWork"
        )[0];
        crate["@graph"] = crate["@graph"].map((e) => {
            if (e["@id"] === rootDescriptor.about["@id"]) {
                // the root dataset

                // attach the property
                e[update.property] = [e[update.property]];
                e[update.property] = flattenDeep(e[update.property]);

                // add the link
                e[update.property].push({
                    "@id": id,
                    "@type": "URL",
                });
                e[update.property] = uniqBy(e[update.property], "@id");
                e[update.property] = compact(e[update.property]);
            }
            return e;
        });
        await store.put({ json: crate, target: "ro-crate-metadata.json" });
    }
    return;
}

// TODO: this code does not have tests
async function postUnlinkItemsHandler(req) {
    const updates = req.body.updates;

    let source = await models[updates[0].sourceType].findOne({
        where: { identifier: updates[0].source },
    });
    let target = await models[updates[0].targetType].findOne({
        where: { identifier: updates[0].target },
    });
    if (updates[0].sourceType === "item") {
        await source.removeCollection(target);
    } else if (updates[0].sourceType === "collection" && updates[0].targetType === "collection") {
        await source.removeSubCollection(target);
        await target.removeSubCollection(source);
    } else if (updates[0].sourceType === "collection" && updates[0].targetType === "item") {
        await source.removeItem(target);
    }
    for (let update of req.body.updates) {
        const id = assembleUrl({ targetType: update.targetType, identifier: update.target });

        let store = await getStoreHandle({ id: update.source, type: update.sourceType });
        let crate;
        try {
            crate = await store.getJSON({ target: "ro-crate-metadata.json" });
        } catch (error) {
            crate = createDefaultROCrateFile({ name: update.source });
            await store.put({ json: crate, target: "ro-crate-metadata.json" });
        }
        let rootDescriptor = crate["@graph"].filter(
            (e) => e["@id"] === "ro-crate-metadata.json" && e["@type"] === "CreativeWork"
        )[0];
        crate["@graph"] = crate["@graph"].map((e) => {
            if (e["@id"] === rootDescriptor.about["@id"]) {
                // the root dataset

                // remove the association
                e[update.property] = [e[update.property]];
                e[update.property] = flattenDeep(e[update.property]);
                e[update.property] = e[update.property].filter((e) => e?.["@id"] !== id);
                if (!e[update.property].length) delete e[update.property];
            }
            return e;
        });
        crate["@graph"] = crate["@graph"].filter((e) => e["@id"] !== id);
        await store.put({ json: crate, target: "ro-crate-metadata.json" });
    }
    return;
}

// TODO: this code does not have tests
async function postCopyCrateHandler(req) {
    const copy = req.body.copy;
    let store = await getStoreHandle({ id: copy.source, type: copy.sourceType });
    let crate = await store.getJSON({ target: "ro-crate-metadata.json" });
    store = await getStoreHandle({ id: copy.target, type: copy.sourceType });
    await store.put({ json: crate, target: "ro-crate-metadata.json" });
    return;
}

// TODO: this code does not have tests
async function getDescriboROCrate(req) {
    const { type, identifier } = req.params;
    let store = await getStoreHandle({ id: identifier, type });

    let crate, filesAdded;
    try {
        crate = await store.getJSON({ target: "ro-crate-metadata.json" });
    } catch (error) {
        crate = createDefaultROCrateFile({ name: identifier });
    }

    crate = new ROCrate(crate);
    crate.rootDataset.identifier = identifier;
    return { crate: crate.toJSON() };
}

// TODO: this code does not have tests
async function putDescriboROCrate(req) {
    let store = await getStoreHandle({ id: req.params.identifier, type: req.params.type });
    await store.put({ target: "ro-crate-metadata.json", json: req.body.data.crate });
    return {};
}

// TODO: this code does not have tests
async function getDescriboProfile(req, res, next) {
    let profile = await loadProfile({ profile: `nyingarn-${req.params.type}-profile.json` });
    return { profile };
}
