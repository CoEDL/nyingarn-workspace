import {
    demandAdministrator,
    demandAuthenticatedUser,
    requireCollectionAccess,
    requireItemAccess,
    getS3Handle,
    getStoreHandle,
    resourceStatusFile,
    completedResources,
    listObjects,
} from "../common/index.js";
import {
    lookupItemByIdentifier,
    listItemResources,
    updateResourceStatus,
    updateItemStatus,
} from "../lib/item.js";
import { lookupCollectionByIdentifier } from "../lib/collection.js";
import {
    getAdminItems,
    getAdminCollections,
    connectAdminToItem,
    connectAdminToCollection,
    importItemsFromStorageIntoTheDb,
    importCollectionsFromStorageIntoTheDb,
    getItemsAwaitingReview,
    getCollectionsAwaitingReview,
    objectRequiresMoreWork,
    publishObject,
    depositObjectIntoRepository,
    restoreObjectIntoWorkspace,
} from "../lib/admin.js";

export function setupRoutes(fastify, options, done) {
    fastify.addHook("preHandler", demandAuthenticatedUser);

    fastify.register((fastify, options, done) => {
        fastify.addHook("preHandler", async (req, res) => {
            if (req.params.type === "items") {
                await requireItemAccess(req, res);
            } else if (req.params.type === "collections") {
                await requireCollectionAccess(req, res);
            }
        });
        fastify.put("/admin/:type/:identifier/restore", putRestoreObjectHandler);
        done();
    });

    fastify.register((fastify, options, done) => {
        fastify.addHook("preHandler", demandAdministrator);

        fastify.get("/admin", async (req, res) => {});
        fastify.get("/admin/entries/items", getAdminEntriesItemsHandler);
        fastify.get("/admin/entries/collections", getAdminEntriesCollectionsHandler);

        fastify.get("/admin/items/import", importItemsFromStorageIntoTheDbHandler);
        fastify.get("/admin/items/awaiting-review", getItemsAwaitingReviewHandler);

        fastify.get("/admin/collections/import", importCollectionsFromStorageIntoTheDbHandler);
        fastify.get("/admin/collections/awaiting-review", getCollectionsAwaitingReviewHandler);

        fastify.put("/admin/:type/:identifier/connect-user", putAdminConnectUserHandler);

        fastify.register((fastify, options, done) => {
            fastify.addHook("preHandler", async (req, res) => {
                if (req.params.type === "items") {
                    await requireItemAccess(req, res);
                } else if (req.params.type === "collections") {
                    await requireCollectionAccess(req, res);
                }
            });
            fastify.put("/admin/:type/:identifier/deposit", putDepositObjectHandler);
            fastify.put("/admin/:type/:identifier/needs-work", putObjectNeedsWorkHandler);
            done();
        });

        fastify.get("/admin/migrate", migrateBackend);

        done();
    });
    done();
}

async function getAdminEntriesItemsHandler(req) {
    let { prefix, offset } = req.query;

    let { items, total } = await getAdminItems({ user: req.session.user, prefix, offset });
    return { items, total };
}

async function getAdminEntriesCollectionsHandler(req) {
    let { prefix, offset } = req.query;

    let { collections, total } = await getAdminCollections({
        user: req.session.user,
        prefix,
        offset,
    });
    return { collections, total };
}

async function importItemsFromStorageIntoTheDbHandler(req) {
    await importItemsFromStorageIntoTheDb({
        user: req.session.user,
        configuration: req.session.configuration,
    });
    return {};
}

async function importCollectionsFromStorageIntoTheDbHandler(req) {
    await importCollectionsFromStorageIntoTheDb({
        user: req.session.user,
        configuration: req.session.configuration,
    });
    return {};
}

async function putAdminConnectUserHandler(req) {
    if (req.params.type === "items") {
        await connectAdminToItem({ identifier: req.params.identifier, user: req.session.user });
    } else if (req.params.type === "collections") {
        await connectAdminToCollection({
            identifier: req.params.identifier,
            user: req.session.user,
        });
    }
}

async function getItemsAwaitingReviewHandler(req) {
    let { items } = await getItemsAwaitingReview({ user: req.session.user });
    return { items };
}

async function getCollectionsAwaitingReviewHandler(req) {
    let { collections } = await getCollectionsAwaitingReview({ user: req.session.user });
    return { collections };
}

async function putDepositObjectHandler(req) {
    let { type, identifier } = req.params;
    const version = req.body.version;
    type = type === "items" ? "item" : "collection";

    // mark the object as published
    req.io.to(req.query.clientId).emit(`deposit-${type}`, {
        msg: `Setting the ${type} status to 'Published'`,
        date: new Date(),
    });
    await publishObject({
        user: req.session.user,
        type,
        identifier,
        configuration: req.session.configuration,
    });

    // deposit it into the repository
    req.io.to(req.query.clientId).emit(`deposit-${type}`, {
        msg: `Depositing the ${type} into the repository`,
        date: new Date(),
    });
    await depositObjectIntoRepository({
        type,
        identifier,
        version,
        io: req.io.to(req.query.clientId),
    });

    req.io.to(req.query.clientId).emit(`deposit-${type}`, { msg: `Done`, date: new Date() });
}

async function putRestoreObjectHandler(req) {
    let { type, identifier } = req.params;
    type = type === "items" ? "item" : "collection";

    req.io.to(req.query.clientId).emit(`restore-${type}`, {
        msg: `Setting the ${type} status to 'In Progress'`,
        date: new Date(),
    });
    // set the objects status back to inProgress
    let model;
    if (type === "collection") {
        model = await lookupCollectionByIdentifier({ identifier });
    } else if (type === "item") {
        model = await lookupItemByIdentifier({ identifier });
    }
    model.publicationStatus = "inProgress";
    await model.save();

    // restore it back into the workspace
    await restoreObjectIntoWorkspace({ type, identifier, io: req.io.to(req.query.clientId) });

    req.io.to(req.query.clientId).emit(`restore-${type}`, { msg: `Done`, date: new Date() });
}

async function putObjectNeedsWorkHandler(req, res) {
    let { type, identifier } = req.params;
    type = type === "items" ? "item" : "collection";

    await objectRequiresMoreWork({ user: req.session.user, type, identifier });
}

async function migrateBackend(req) {
    console.log("NOT RUNNING: migrate backend");
    return;

    let items = await listObjects({ prefix: `/nyingarn.net/workspace/item` });
    for (let item of items) {
        try {
            item = await bucket.readJSON({ target: item });
            console.log(item);
            item.type = "item";
            const identifier = item.id;

            let store = await getStoreHandle(item);

            // get completed file
            // let completed = {};
            // try {
            //     completed = await store.getJSON({ target: completedResources });
            // } catch (error) {
            //     // if no completed file - nothing to do
            //     continue;
            // }

            // let statusFile = { item: {}, resources: {} };
            // try {
            //     statusFile = await store.getJSON({ target: resourceStatusFile });
            // } catch (error) {
            //     // if no status file - nothing to do
            //     continue;
            // }

            // for (let resource of Object.keys(completed)) {
            //     let isCompleted = completed[resource];
            //     resource = resource.replace(`${identifier}/`, "");
            //     if (
            //         statusFile.resources?.[resource]?.tei?.exists &&
            //         statusFile.resources?.[resource]?.tei?.wellFormed
            //     ) {
            //         statusFile.resources[resource].complete = isCompleted;
            //     }
            // }

            // let { resources } = await listItemResources({ identifier });
            // resources = resources.map((r) => r.name);

            // for (let resource of resources) {
            //     console.log("processing ", resource);
            //     statusFile = await updateResourceStatus({ identifier, resource, statusFile });
            //     if (
            //         statusFile.resources[resource].tei.exists &&
            //         statusFile.resources[resource].tei.wellFormed
            //     ) {
            //         statusFile.resources[resource].complete = completed[resource] ?? false;
            //     }
            // }
            // const itemStatus = updateItemStatus({ statusFile });
            // statusFile.item = itemStatus;
            // await store.put({ target: resourceStatusFile, json: statusFile, registerFile: false });
            // await store.delete({ target: completedResources });
        } catch (error) {
            console.log(error);
        }
    }
    console.log("done");
}
