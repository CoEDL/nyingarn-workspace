import { route, getStoreHandle, getLogger, loadProfile } from "../common";
import { uniqBy, isArray } from "lodash";
import models from "../models";
const log = getLogger();

export function setupRoutes({ server }) {
    server.post("/describo/link", route(postLinkItemsHandler));
    server.get("/describo/rocrate/:type/:identifier", route(getDescriboROCrate));
    server.put("/describo/rocrate/:type/:identifier", route(putDescriboROCrate));
    server.get("/describo/profile/:type", route(getDescriboProfile));
}

// TODO: this code does not have tests
async function postLinkItemsHandler(req, res, next) {
    let source, target;
    for (let update of req.body.updates) {
        console.log(update);
        if (update.sourceType === "collection") {
            source = await models.collection.findOne({ where: { identifier: update.source } });
            if (update.targetType === "collection") {
                target = await models.collection.findOne({
                    where: { identifier: update.target },
                });
                await source.addSubCollection(target);
            } else {
                target = await models.item.findOne({ where: { identifier: update.targetType } });
                await source.addItem(target);
            }
        } else if (update.sourceType === "item") {
            source = await models.item.findOne({ where: { identifier: update.source } });
            target = await models.collection.findOne({ where: { identifier: update.target } });
            await source.addCollection(target);
        }

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
