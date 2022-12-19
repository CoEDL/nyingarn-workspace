import models from "../models/index.js";
import {
    logEvent,
    getLogger,
    getStoreHandle,
    demandAuthenticatedUser,
    requireCollectionAccess,
} from "../common/index.js";
import lodashPkg from "lodash";
const { groupBy } = lodashPkg;
import {
    getCollections,
    lookupCollectionByIdentifier,
    createCollection,
    linkCollectionToUser,
    deleteCollection,
    toggleCollectionVisibility,
} from "../lib/collection.js";
const log = getLogger();

export function setupRoutes(fastify, options, done) {
    fastify.addHook("preHandler", demandAuthenticatedUser);

    // user routes
    fastify.get("/collections", getCollectionsHandler);
    fastify.post("/collections", postCollectionHandler);

    // user routes - access specific collection
    fastify.register((fastify, options, done) => {
        fastify.addHook("preHandler", requireCollectionAccess);
        fastify.get("/collections/:identifier", getCollectionHandler);
        fastify.put("/collections/:identifier/attach-user", putCollectionInviteUserHandler);
        fastify.put("/collections/:identifier/detach-user", putCollectionDetachUserHandler);
        fastify.put("/collections/:identifier/toggle-visibility", putCollectionToggleVisibility);
        fastify.get("/collections/:identifier/users", getCollectionUsers);
        fastify.delete("/collections/:identifier", deleteCollectionHandler);
        done();
    });
    done();
}

async function getCollectionsHandler(req) {
    const userId = req.session.user.id;
    const offset = req.query.offset;
    const limit = req.query.limit;
    const match = req.query.match;
    let { count, rows } = await getCollections({
        userId,
        offset,
        limit,
        match,
    });
    let collections = rows.map((c) => {
        return {
            name: c.identifier,
            private: c.data?.private,
            type: "collection",
            publicationStatus: c.publicationStatus,
            items: groupBy(
                c.items.map((i) => ({ type: "item", identifier: i.identifier })),
                "identifier"
            ),
            collections: groupBy(
                c.subCollection.map((c) => ({
                    type: "collection",
                    identifier: c.identifier,
                })),
                "identifier"
            ),
        };
    });
    return { total: count, collections };
}

async function getCollectionHandler(req) {
    let members = [
        ...(await req.session.collection.getItems()).map((i) => ({ ...i.get(), type: "item" })),
        ...(await req.session.collection.getSubCollection()).map((c) => ({
            ...c.get(),
            type: "collection",
        })),
    ];
    return { collection: { ...req.session.collection.get(), members } };
}

async function postCollectionHandler(req, res) {
    if (!req.body.identifier) {
        return res.badRequest(`collection identifier not defined`);
    }
    // is that identifier already in use?
    let collection = await lookupCollectionByIdentifier({
        identifier: req.body.identifier,
    });
    if (!collection) {
        // identifier not in use so create the collection
        await logEvent({
            level: "info",
            owner: req.session.user.email,
            text: `Creating new collection with identifier ${req.body.identifier}`,
        });
        collection = await createCollection({
            identifier: req.body.identifier,
            userId: req.session.user.id,
        });
    } else {
        // item with that identifier exists but does it belong that user?
        collection = await lookupCollectionByIdentifier({
            identifier: req.body.identifier,
            userId: req.session.user.id,
        });
        if (!collection) {
            await logEvent({
                level: "error",
                owner: req.session.user.email,
                text: `Creating new collection with identifier ${req.body.identifier} failed. Collection belongs to someone else.`,
            });
            return res.forbidden(`That identifier is already taken`);
        }
    }

    return { collection: collection.get() };
}

async function putCollectionInviteUserHandler(req, res) {
    let user = await models.user.findOne({ where: { email: req.body.email } });
    if (!user) {
        return res.notFound();
    }
    try {
        await linkCollectionToUser({ collectionId: req.session.collection.id, userId: user.id });
        await logEvent({
            level: "info",
            owner: req.session.user.email,
            text: `User '${req.session.user.email}' invited '${user.email}' to '${req.session.collection.identifier}'`,
        });
        return {};
    } catch (error) {
        return res.internalServerError();
    }
}

async function putCollectionDetachUserHandler(req, res) {
    let user = await models.user.findOne({ where: { id: req.body.userId } });
    try {
        await req.session.collection.removeUser([user]);
        return {};
    } catch (error) {
        return res.internalServerError();
    }
}

async function putCollectionToggleVisibility(req, res) {
    try {
        await toggleCollectionVisibility({ collectionId: req.session.collection.id });
        return {};
    } catch (error) {
        return res.internalServerError();
    }
}

async function getCollectionUsers(req) {
    let users = await req.session.collection.getUsers();
    users = users.map((u) => {
        return {
            id: u.id,
            email: u.email,
            givenName: u.givenName,
            familyName: u.familyName,
            administrator: u.administrator,
            loggedin: req.session.user.id === u.id ? true : false,
        };
    });
    return { users };
}

async function deleteCollectionHandler(req, res) {
    try {
        await deleteCollection({ id: req.session.collection.id });
        let store = await getStoreHandle({ id: req.params.identifier, className: "collection" });
        await store.deleteItem();
        await logEvent({
            level: "info",
            owner: req.session.user.email,
            text: `User deleted item '${req.session.collection.identifier}'`,
        });
        return {};
    } catch (error) {
        log.error(`Error deleting collection with id: '${req.session.collection.identifier}'`);
        return res.internalServerError();
    }
}
