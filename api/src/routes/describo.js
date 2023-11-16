import { loadProfile } from "../common/configuration.js";
import { demandAuthenticatedUser } from "../common/middleware.js";
import { getStoreHandle } from "../common/getS3Handle.js";
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
        return `https://repository.nyingarn.net/collections/${identifier}`;
    } else if (targetType === "item") {
        return `https://repository.nyingarn.net/items/${identifier}`;
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
        const property = update.sourceType === "item" ? "memberOf" : "hasMember";
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
                e[property] = [e[property]];
                e[property] = flattenDeep(e[property]);

                // add the link
                e[property].push({
                    "@id": id,
                    "@type": "URL",
                });
                e[property] = uniqBy(e[property], "@id");
                e[property] = compact(e[property]);
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
        const property = update.sourceType === "item" ? "memberOf" : "hasMember";
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
                e[property] = [e[property]];
                e[property] = flattenDeep(e[property]);
                e[property] = e[property].filter((e) => e?.["@id"] !== id);
                if (!e[property].length) delete e[property];
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

    // remove properties that will be specific to the crate we're copying from
    let rootDescriptor = crate["@graph"].filter(
        (e) => e["@id"] === "ro-crate-metadata.json" && e["@type"] === "CreativeWork"
    )[0];
    crate["@graph"] = crate["@graph"].map((e) => {
        if (e["@id"] === rootDescriptor.about["@id"]) {
            delete e["hasMember"];
            delete e["hasPart"];
            delete e["licence"];
        }
        return e;
    });

    store = await getStoreHandle({ id: copy.target, type: copy.sourceType });
    await store.put({ json: crate, target: "ro-crate-metadata.json" });

    // copy allowed users
    let sourceItem = await models.item.findOne({
        where: { identifier: copy.source },
        include: [{ model: models.user }],
    });
    let targetItem = await models.item.findOne({ where: { identifier: copy.target } });
    for (let user of sourceItem.users) {
        await targetItem.addUser(user);
    }
    return;
}

// TODO: this code does not have tests
async function getDescriboROCrate(req) {
    const { type, identifier } = req.params;

    let store = await getStoreHandle({ id: identifier, type });

    if (req.query.reset === "true") {
        await store.put({
            target: "ro-crate-metadata.json",
            json: createDefaultROCrateFile({ name: identifier }),
        });
    }

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
