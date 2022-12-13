import {
    listObjects,
    loadConfiguration,
    demandAdministrator,
    demandAuthenticatedUser,
} from "../common/index.js";
import { createItem, lookupItemByIdentifier, linkItemToUser, getItems } from "../lib/item.js";
import {
    createCollection,
    lookupCollectionByIdentifier,
    linkCollectionToUser,
    getCollections,
} from "../lib/collection.js";
import models from "../models/index.js";
import { Op } from "sequelize";
import lodashPkg from "lodash";
const { groupBy } = lodashPkg;

export function setupRoutes(fastify, options, done) {
    fastify.addHook("preHandler", demandAuthenticatedUser);
    fastify.addHook("preHandler", demandAdministrator);

    fastify.get("/admin", async (req, res) => {});
    fastify.get("/admin/entries/items", getAdminEntriesItemsHandler);
    fastify.get("/admin/entries/collections", getAdminEntriesCollectionsHandler);

    fastify.get("/admin/items/import", importItemsFromStorageIntoTheDb);
    fastify.put("/admin/items/:identifier/connect-user", putAdminItemUserHandler);

    fastify.get("/admin/collections/import", importCollectionsFromStorageIntoTheDb);
    fastify.put("/admin/collections/:identifier/connect-user", putAdminCollectionUserHandler);
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
    console.log(where);
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
    console.log(where);
    myCollections = groupBy(myCollections, "identifier");

    let { count: collectionsTotal, rows: collections } = await models.collection.findAndCountAll({
        where,
        offset,
        limit,
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
    for (let item of items) {
        await models.item.findOrCreate({
            where: { identifier: item.identifier },
        });
    }
    return {};
}

// TODO: this code does not have tests
async function importCollectionsFromStorageIntoTheDb(req) {
    const configuration = req.session.configuration;
    let collections =
        (await listObjects({ prefix: `/${configuration.api.domain}/collection` })) || [];
    collections = collections.map((i) => ({ identifier: i }));
    for (let collection of collections) {
        await models.collection.findOrCreate({
            where: { identifier: collection.identifier },
        });
    }
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
