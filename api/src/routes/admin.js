import { listObjects, demandAdministrator, demandAuthenticatedUser } from "../common/index.js";
import { createItem, lookupItemByIdentifier, linkItemToUser, getItems } from "../lib/item.js";
import {
    createCollection,
    lookupCollectionByIdentifier,
    linkCollectionToUser,
    getCollections,
} from "../lib/collection.js";
import models from "../models/index.js";
import { Op, fn as seqFn, col as seqCol } from "sequelize";
import lodashPkg from "lodash";
const { groupBy } = lodashPkg;

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
    fastify.put("/admin/:type/:identifier/needsWork", putNeedsWorkHandler);
    done();
}

// TODO: this code does not have tests
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

// TODO: this code does not have tests
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

// TODO: this code does not have tests
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

// TODO: this code does not have tests
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

// TODO: this code does not have tests
async function putAdminItemUserHandler(req) {
    let item = await lookupItemByIdentifier({ identifier: req.params.identifier });
    if (item) {
        await linkItemToUser({ itemId: item.id, userId: req.session.user.id });
    } else {
        item = await createItem({ identifier: req.params.identifier, userId: req.session.user.id });
    }
    return {};
}

// TODO: this code does not have tests
async function putAdminCollectionUserHandler(req) {
    let collection = await lookupCollectionByIdentifier({ identifier: req.params.identifier });
    if (collection) {
        await linkCollectionToUser({ collectionId: collection.id, userId: req.session.user.id });
    } else {
        collection = await createCollection({
            identifier: req.params.identifier,
            userId: req.session.user.id,
        });
    }
    return {};
}

// TODO: this code does not have tests
async function getItemsAwaitingReviewHandler(req) {
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

// TODO: this code does not have tests
async function getCollectionsAwaitingReviewHandler(req) {
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

// TODO: this code does not have tests
async function getDepositHandler(req) {
    console.log(req.params);
    return {};
}

// TODO: this code does not have tests
async function putNeedsWorkHandler(req) {
    console.log(req.params);
}
