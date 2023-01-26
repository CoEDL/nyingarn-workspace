import {
    demandAdministrator,
    demandAuthenticatedUser,
    requireCollectionAccess,
    requireItemAccess,
    getS3Handle,
} from "../common/index.js";
import { lookupItemByIdentifier, linkItemToUser } from "../lib/item.js";
import { lookupCollectionByIdentifier, linkCollectionToUser } from "../lib/collection.js";
import models from "../models/index.js";
import { Op, fn as seqFn, col as seqCol } from "sequelize";
import lodashPkg from "lodash";
const { groupBy } = lodashPkg;
import { ROCrate } from "ro-crate";
import { getContext } from "../lib/crate-tools.js";
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
import path from "path";

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

        // fastify.get("/admin/migrate", migrateBackend);

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
    await publishObject({
        user: req.session.user,
        type,
        identifier,
        configuration: req.session.configuration,
    });

    // deposit it into the repository
    await depositObjectIntoRepository({ type, identifier, version });
}

async function putRestoreObjectHandler(req) {
    let { type, identifier } = req.params;
    type = type === "items" ? "item" : "collection";
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
    await restoreObjectIntoWorkspace({ type, identifier });
}

async function putObjectNeedsWorkHandler(req, res) {
    let { type, identifier } = req.params;
    type = type === "items" ? "item" : "collection";

    await objectRequiresMoreWork({ user: req.session.user, type, identifier });
}

// async function migrateBackend(req) {
//     // console.log("migrate backend not implemented");
//     console.log("migrate backend storage");
//     let { bucket } = await getS3Handle();
//     await migrate({});

//     async function migrate({ continuationToken }) {
//         let resources = await bucket.listObjects({
//             continuationToken,
//         });
//         // console.log(resources.Contents.length);
//         for (let resource of resources.Contents) {
//             if (resource.Key.match(/.*\/workspace\/.*\/nocfl.identifier.json/)) {
//                 let content = await bucket.readJSON({ target: resource.Key });
//                 console.log(content);
//                 // let identifier = {
//                 //     id: content.id,
//                 //     type: content.className,
//                 //     prefix: "nyingarn.net/workspace",
//                 //     splay: content.splay ?? 1,
//                 // };
//                 // console.log("updating", resource.Key);
//                 // await bucket.upload({ target: resource.Key, json: identifier });
//                 // console.log(content);
//             }
//             // const source = resource.Key;
//             // const target = resource.Key.replace(/nyingarn.net/, "nyingarn.net/workspace");
//             // if (source !== target) {
//             //     console.log(`Copying ${source} -> ${target}`);
//             //     await bucket.copy({ source, target });
//             // }
//             // console.log({
//             //     source: resource.Key,
//             //     target: resource.Key.replace(/nyingarn.net/, "nyingarn.net/workspace"),
//             // });
//         }
//         if (resources.NextContinuationToken) {
//             await migrate({
//                 continuationToken: resources.NextContinuationToken,
//             });
//         }
//     }
// }
