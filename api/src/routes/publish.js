import {
    demandAuthenticatedUser,
    requireCollectionAccess,
    requireItemAccess,
    getStoreHandle,
} from "../common/index.js";
import { listItemResources, markAllResourcesComplete } from "../lib/item.js";
import lodashPkg from "lodash";
const { uniqBy } = lodashPkg;
import validatorPkg from "validator";
const { isURL } = validatorPkg;
import { ROCrate } from "ro-crate";
import { registerAllFiles, getContext } from "../lib/crate-tools.js";
const authorisedUsersFile = ".authorised-users.json";

export function setupRoutes(fastify, options, done) {
    fastify.addHook("preHandler", demandAuthenticatedUser);

    fastify.register((fastify, options, done) => {
        fastify.addHook("preHandler", requireCollectionAccess);
        fastify.post("/publish/collection/:identifier", postPublishCollectionHandler);
        fastify.get("/publish/collection/:identifier/status", getCollectionPublicationStatus);
        done();
    });

    fastify.register((fastify, options, done) => {
        fastify.addHook("preHandler", requireItemAccess);
        fastify.post("/publish/item/:identifier", postPublishItemHandler);
        fastify.get("/publish/item/:identifier/status", getItemPublicationStatus);
        done();
    });
    done();
}

// TODO: this code does not have tests
async function postPublishCollectionHandler(req, res) {
    if (isURL(req.body.data.user["@id"], { protocols: ["http", "https"] })) {
        req.session.user.identifier = req.body.data.user["@id"];
        await req.session.user.save();
    }

    // check that permission forms are loaded
    //  TODO: not yet implemented

    // set the properties for this collection
    req.session.collection.publicationStatus = "awaitingReview";
    req.session.collection.accessType = "open";

    // save the collection
    await req.session.collection.save();

    let store = await getStoreHandle({
        id: req.session.collection.identifier,
        className: "collection",
    });

    // remove .collection file if it exists
    if (await store.pathExists({ path: ".collection" })) {
        await store.delete({ target: ".collection" });
    }

    // write the metadata into the crate
    let crate;
    try {
        crate = await store.getJSON({ target: "ro-crate-metadata.json" });
        crate = new ROCrate(crate, { array: true });
        let licence = {
            "@id": "LICENCE",
            "@type": ["File", "DataReuselicence"],
            name: "Open (subject to agreeing to PDSC access conditions)",
            access: {
                "@id": "http://purl.archive.org/language-data-commons/terms#OpenAccess",
            },
            authorizationWorkflow: [
                { "@id": "http://purl.archive.org/language-data-commons/terms#AgreeToTerms" },
            ],
        };

        if (crate.getEntity(licence["@id"])) crate.deleteEntity(licence["@id"]);
        crate.addEntity(licence);
        crate.rootDataset.licence = licence;

        crate.addEntity(req.body.data.user);
        let depositor = crate.rootDataset.depositor;
        if (!depositor) {
            depositor = [req.body.data.user];
        } else {
            depositor.push(req.body.data.user);
            depositor = uniqBy(depositor, "@id");
        }
        crate.rootDataset.depositor = depositor;
        crate = crate.toJSON();
        crate["@context"] = getContext();

        await store.put({ target: "ro-crate-metadata.json", json: crate });
    } catch (error) {
        console.log(error);
    }
}

// TODO: this code does not have tests
async function getCollectionPublicationStatus(req) {
    return {
        status: req.session.collection.publicationStatus,
        visibility: req.session.collection.accessType,
        emails: req.session.collection.accessControlList,
    };
}

// TODO: this code does not have tests
async function postPublishItemHandler(req, res) {
    if (isURL(req.body.data.user["@id"], { protocols: ["http", "https"] })) {
        req.session.user.identifier = req.body.data.user["@id"];
        await req.session.user.save();
    }

    let listResources = await listItemResources({ identifier: req.session.item.identifier });
    const resources = listResources.resources;
    await markAllResourcesComplete({
        identifier: req.session.item.identifier,
        resources: resources.map((r) => r.name),
    });

    // check that permission forms are loaded
    //  TODO: not yet implemented

    // set the properties for this item
    req.session.item.publicationStatus = "awaitingReview";
    req.session.item.accessType = req.body.data.visibility;
    req.session.item.accessControlList =
        req.body.data.visibility === "open" ? [] : req.body.data?.emails;
    req.session.item.publicationStatusLogs = [
        "All pages marked complete",
        "Permission forms not loaded",
    ];

    // save the item
    await req.session.item.save();

    let store = await getStoreHandle({ id: req.session.item.identifier, className: "item" });

    // remove authorised users file if exists and item open
    if (await store.pathExists({ path: authorisedUsersFile })) {
        await store.delete({ target: authorisedUsersFile });
    }
    // remove .item file if it exists
    if (await store.pathExists({ path: ".item" })) {
        await store.delete({ target: ".item" });
    }

    // write the metadata into the crate
    let crate;
    try {
        crate = await store.getJSON({ target: "ro-crate-metadata.json" });
        crate = new ROCrate(crate, { array: true });
        let licence = {
            "@id": "LICENCE",
            "@type": ["File", "DataReuselicence"],
            name: "Open (subject to agreeing to PDSC access conditions)",
            access: {
                "@id": "http://purl.archive.org/language-data-commons/terms#OpenAccess",
            },
            authorizationWorkflow: [
                { "@id": "http://purl.archive.org/language-data-commons/terms#AgreeToTerms" },
            ],
        };
        if (req.body.data.visibility === "restricted") {
            licence.access = {
                "@id": "http://purl.archive.org/language-data-commons/terms#AuthorizedAccess",
            };
            licence.authorizationWorkflow.push({
                "@id": "http://purl.archive.org/language-data-commons/terms#AccessControlList",
            });
            licence.accessControlList = `file://${authorisedUsersFile}`;
            await store.put({ target: authorisedUsersFile, json: req.body.data.emails });
        }

        if (crate.getEntity(licence["@id"])) crate.deleteEntity(licence["@id"]);
        crate.addEntity(licence);
        crate.rootDataset.licence = licence;

        crate.addEntity(req.body.data.user);
        let depositor = crate.rootDataset.depositor;
        if (!depositor) {
            depositor = [req.body.data.user];
        } else {
            depositor.push(req.body.data.user);
            depositor = uniqBy(depositor, "@id");
        }
        crate.rootDataset.depositor = depositor;
        crate = await registerAllFiles({ store, crate });
        crate = crate.toJSON();
        crate["@context"] = getContext();

        await store.put({ target: "ro-crate-metadata.json", json: crate });
    } catch (error) {
        console.log(error);
    }
}

// TODO: this code does not have tests
async function getItemPublicationStatus(req) {
    return {
        status: req.session.item.publicationStatus,
        visibility: req.session.item.accessType,
        emails: req.session.item.accessControlList,
    };
}
