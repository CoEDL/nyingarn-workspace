import {
    listObjects,
    demandAdministrator,
    demandAuthenticatedUser,
    getStoreHandle,
} from "../common/index.js";
import { lookupItemByIdentifier, linkItemToUser } from "../lib/item.js";
import { lookupCollectionByIdentifier, linkCollectionToUser } from "../lib/collection.js";
import models from "../models/index.js";
import { Op, fn as seqFn, col as seqCol } from "sequelize";
import lodashPkg from "lodash";
const { groupBy } = lodashPkg;
import { ROCrate } from "ro-crate";
import { authorisedUsersFile } from "./publish.js";
import { getContext } from "../lib/crate-tools.js";
import path from "path";

export function setupRoutes(fastify, options, done) {
    fastify.addHook("preHandler", demandAuthenticatedUser);
    fastify.addHook("preHandler", demandAdministrator);

    fastify.get("/admin", async (req, res) => {});
    fastify.get("/admin/entries/items", getAdminEntriesItemsHandler);
    fastify.get("/admin/entries/collections", getAdminEntriesCollectionsHandler);

    fastify.get("/admin/items/import", importItemsFromStorageIntoTheDb);
    fastify.get("/admin/items/awaiting-review", getItemsAwaitingReviewHandler);
    fastify.put("/admin/items/:identifier/connect-user", putAdminItemUserHandler);

    fastify.get("/admin/collections/import", importCollectionsFromStorageIntoTheDb);
    fastify.get("/admin/collections/awaiting-review", getCollectionsAwaitingReviewHandler);
    fastify.put("/admin/collections/:identifier/connect-user", putAdminCollectionUserHandler);

    fastify.get("/admin/:type/:identifier/deposit", getDepositHandler);
    fastify.put("/admin/:type/:identifier/needs-work", putNeedsWorkHandler);
    done();
}

async function getAdminEntriesItemsHandler(req) {
    let { prefix, offset } = req.query;
    if (!offset) offset = 0;
    const limit = 10;

    let where = {};
    if (prefix) {
        where.identifier = {
            [Op.startsWith]: prefix,
        };
    }
    let myItems = await models.item.findAll({
        where,
        include: [{ model: models.user, where: { id: req.session.user.id } }],
        attributes: ["identifier"],
        raw: true,
    });
    myItems = groupBy(myItems, "identifier");

    let { count: itemsTotal, rows: items } = await models.item.findAndCountAll({
        where,
        offset,
        limit,
        order: [[seqFn("lower", seqCol("identifier")), "ASC"]],
        attributes: ["identifier"],
        raw: true,
    });

    items = items.map((i) => ({ ...i, connected: myItems[i.identifier]?.length ? true : false }));
    return { items, itemsTotal };
}

async function getAdminEntriesCollectionsHandler(req) {
    let { prefix, offset } = req.query;
    if (!offset) offset = 0;
    const limit = 10;

    let where = {};
    if (prefix) {
        where.identifier = {
            [Op.startsWith]: prefix,
        };
    }
    let myCollections = await models.collection.findAll({
        where,
        include: [{ model: models.user, where: { id: req.session.user.id } }],
        attributes: ["identifier"],
        raw: true,
    });
    myCollections = groupBy(myCollections, "identifier");

    let { count: collectionsTotal, rows: collections } = await models.collection.findAndCountAll({
        where,
        offset,
        limit,
        order: [[seqFn("lower", seqCol("identifier")), "ASC"]],
        attributes: ["identifier"],
        raw: true,
    });

    collections = collections.map((i) => ({
        ...i,
        connected: myCollections[i.identifier]?.length ? true : false,
    }));
    return { collections, collectionsTotal };
}

async function importItemsFromStorageIntoTheDb(req) {
    const configuration = req.session.configuration;
    let items = (await listObjects({ prefix: `/${configuration.api.domain}/item` })) || [];
    items = items.map((i) => ({ identifier: i }));

    // insert any items found on the backend storage not already in the DB
    for (let item of items) {
        await models.item.findOrCreate({
            where: { identifier: item.identifier },
        });
    }

    // ensure all existing items and collections have a publicationStatus
    await models.item.update(
        { publicationStatus: "inProgress" },
        { where: { publicationStatus: null } }
    );
    return {};
}

async function importCollectionsFromStorageIntoTheDb(req) {
    const configuration = req.session.configuration;
    let collections =
        (await listObjects({ prefix: `/${configuration.api.domain}/collection` })) || [];
    collections = collections.map((i) => ({ identifier: i }));

    // insert any collections found on the backend storage not already in the DB
    for (let collection of collections) {
        await models.collection.findOrCreate({
            where: { identifier: collection.identifier },
        });
    }

    // ensure all existing items and collections have a publicationStatus
    await models.collection.update(
        { publicationStatus: "inProgress" },
        { where: { publicationStatus: null } }
    );
    return {};
}

async function putAdminItemUserHandler(req) {
    let item = await lookupItemByIdentifier({ identifier: req.params.identifier });
    if (!item) {
        return res.internalServerError();
    }
    await linkItemToUser({ itemId: item.id, userId: req.session.user.id });
    return {};
}

async function putAdminCollectionUserHandler(req) {
    let collection = await lookupCollectionByIdentifier({ identifier: req.params.identifier });
    if (!collection) {
        return res.internalServerError();
    }
    await linkCollectionToUser({ collectionId: collection.id, userId: req.session.user.id });
    return {};
}

async function getItemsAwaitingReviewHandler() {
    let items = await models.item.findAll({
        where: { publicationStatus: "awaitingReview" },
        attributes: ["identifier", "publicationStatus", "publicationStatusLogs"],
    });
    if (items) {
        items = items.map((item) => item.get());
        return { items };
    } else {
        return [];
    }
}

async function getCollectionsAwaitingReviewHandler() {
    let collections = await models.collection.findAll({
        where: { publicationStatus: "awaitingReview" },
        attributes: ["identifier", "publicationStatus", "publicationStatusLogs"],
    });
    if (collections) {
        collections = collections.map((collection) => collection.get());
        return { collections };
    } else {
        return [];
    }
}

async function getDepositHandler(req) {
    const { type, identifier } = req.params;
    const className = type === "items" ? "item" : "collection";
    let store = await getStoreHandle({
        id: identifier,
        className,
    });

    let crate;
    try {
        crate = await store.getJSON({ target: "ro-crate-metadata.json" });
        crate = new ROCrate(crate, { array: true });
    } catch (error) {
        console.log(error);
        return res.internalServerError();
    }

    let licence;
    if (className === "collection") {
        const collection = await lookupCollectionByIdentifier({ identifier });
        collection.publicationStatus = "published";
        await collection.save();

        // write the metadata into the crate
        licence = {
            "@id": req.session.configuration.api.licence,
            "@type": ["File", "DataReuselicence"],
            name: "Open (subject to agreeing to PDSC access conditions)",
            access: {
                "@id": "http://purl.archive.org/language-data-commons/terms#OpenAccess",
            },
            authorizationWorkflow: [
                { "@id": "http://purl.archive.org/language-data-commons/terms#AgreeToTerms" },
            ],
        };
    } else if (className === "item") {
        const item = await lookupItemByIdentifier({ identifier });
        item.publicationStatus = "published";
        await item.save();

        licence = {
            "@id": req.session.configuration.api.licence,
            "@type": ["File", "DataReuselicence"],
            name: "Open (subject to agreeing to PDSC access conditions)",
            access: {
                "@id": "http://purl.archive.org/language-data-commons/terms#OpenAccess",
            },
            authorizationWorkflow: [
                { "@id": "http://purl.archive.org/language-data-commons/terms#AgreeToTerms" },
            ],
        };
        if (item.accessType === "restricted") {
            licence.access = {
                "@id": "http://purl.archive.org/language-data-commons/terms#AuthorizedAccess",
            };
            licence.authorizationWorkflow.push({
                "@id": "http://purl.archive.org/language-data-commons/terms#AccessControlList",
            });
            licence.accessControlList = `file://${authorisedUsersFile}`;
        }
    }

    if (crate.getEntity(licence["@id"])) crate.deleteEntity(licence["@id"]);
    crate.addEntity(licence);
    crate.rootDataset.licence = licence;
    crate = crate.toJSON();
    crate["@context"] = getContext();
    await store.put({ target: "ro-crate-metadata.json", json: crate });
    await store.put({
        target: req.session.configuration.api.licence,
        localPath: path.join(`/srv/configuration/${req.session.configuration.api.licence}`),
        registerFile: false,
    });

    return {};
}

async function putNeedsWorkHandler(req, res) {
    const { type, identifier } = req.params;
    const className = type === "items" ? "item" : "collection";

    if (className === "collection") {
        const collection = await lookupCollectionByIdentifier({ identifier });
        collection.publicationStatus = "needsWork";
        await collection.save();
    } else if (className === "item") {
        const item = await lookupItemByIdentifier({ identifier });
        item.publicationStatus = "needsWork";
        await item.save();
    }
}
