import { loadConfiguration, getLogger, loadProfile } from "../common";
import { route, getStoreHandle } from "../common";
import { BadRequestError } from "restify-errors";
import fetch from "node-fetch";
import models from "../models";
const log = getLogger();

export function setupRoutes({ server }) {
    server.get("/describo/rocrate/:type/:identifier", route(getDescriboROCrate));
    server.put("/describo/rocrate/:type/:identifier", route(putDescriboROCrate));
    server.get("/describo/profile/:type", route(getDescriboProfile));
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
