import { route, getStoreHandle, getLogger, loadProfile } from "../common";
import { uniqBy, isArray } from "lodash";
import models from "../models";
const log = getLogger();

export function setupRoutes({ server }) {
    server.post("/describo/link", route(postLinkItemsHandler));
    server.post("/describo/unlink", route(postUnlinkItemsHandler));
    server.get("/describo/rocrate/:type/:identifier", route(getDescriboROCrate));
    server.put("/describo/rocrate/:type/:identifier", route(putDescriboROCrate));
    server.get("/describo/profile/:type", route(getDescriboProfile));
}

// TODO: this code does not have tests
async function postLinkItemsHandler(req, res, next) {
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
        let store = await getStoreHandle({ id: update.source, className: update.sourceType });
        let crate = await store.getJSON({ target: "ro-crate-metadata.json" });
        let rootDescriptor = crate["@graph"].filter(
            (e) => e["@id"] === "ro-crate-metadata.json" && e["@type"] === "CreativeWork"
        )[0];
        crate["@graph"] = crate["@graph"].map((e) => {
            if (e["@id"] === rootDescriptor.about["@id"]) {
                // the root dataset

                // attach the property
                if (!e[update.property]) e[update.property] = [];
                if (!isArray(e[update.propery])) e[update.property] = [e[update.property]];

                // add the link
                e[update.property].push({
                    "@id": `https://catalog.nyingarn.net/view/${update.targetType}/${update.target}`,
                    "@type": "URL",
                });
                e[update.property] = uniqBy(e[update.property], "@id");
            }
            return e;
        });
        await store.put({ json: crate, target: "ro-crate-metadata.json" });
    }
    res.send();
    next();
}

// TODO: this code does not have tests
async function postUnlinkItemsHandler(req, res, next) {
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
        let store = await getStoreHandle({ id: update.source, className: update.sourceType });
        let crate = await store.getJSON({ target: "ro-crate-metadata.json" });
        let rootDescriptor = crate["@graph"].filter(
            (e) => e["@id"] === "ro-crate-metadata.json" && e["@type"] === "CreativeWork"
        )[0];
        crate["@graph"] = crate["@graph"].map((e) => {
            if (e["@id"] === rootDescriptor.about["@id"]) {
                // the root dataset

                // remove the association
                if (!isArray[e[update.property]]) e[update.property] = [e[update.property]];
                e[update.propery] = e[update.property].filter(
                    (e) =>
                        e["@id"] !==
                        `https://catalog.nyingarn.net/view/${update.targetType}/${update.target}`
                );
            }
            return e;
        });
        await store.put({ json: crate, target: "ro-crate-metadata.json" });
    }
    res.send();
    next();
}

// TODO: this code does not have tests
async function getDescriboROCrate(req, res, next) {
    let store = await getStoreHandle({ id: req.params.identifier, className: req.params.type });
    let rocrateFile;
    try {
        rocrateFile = await store.getJSON({ target: "ro-crate-metadata.json" });
    } catch (error) {
        rocrateFile = createDefaultROCrateFile({ name: req.params.identifier });
    }
    res.send({ rocrateFile });
    next();
}

// TODO: this code does not have tests
async function putDescriboROCrate(req, res, next) {
    let store = await getStoreHandle({ id: req.params.identifier, className: req.params.type });
    await store.put({ target: "ro-crate-metadata.json", json: req.body.data.crate });
    res.send();
    next();
}

// TODO: this code does not have tests
async function getDescriboProfile(req, res, next) {
    let profile = await loadProfile({ profile: `nyingarn-${req.params.type}-profile.json` });
    res.send({ profile });
    next();
}

function createDefaultROCrateFile({ name }) {
    return {
        "@context": [
            "https://w3id.org/ro/crate/1.1/context",
            {
                "@vocab": "http://schema.org/",
            },
            {
                txc: {
                    "@id": "http://purl.archive.org/textcommons/terms#",
                },
            },
            {
                "@base": null,
            },
        ],
        "@graph": [
            {
                "@id": "ro-crate-metadata.json",
                "@type": "CreativeWork",
                conformsTo: {
                    "@id": "https://w3id.org/ro/crate/1.1/context",
                },
                about: {
                    "@id": "./",
                },
            },
            {
                "@id": "./",
                "@type": "Dataset",
                name: name,
            },
        ],
    };
}
