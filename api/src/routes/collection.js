import models from "../models";
import {
    BadRequestError,
    ForbiddenError,
    NotFoundError,
    InternalServerError,
} from "restify-errors";
import { route, routeAdmin, logEvent, getLogger, getS3Handle } from "../common";
import { orderBy, groupBy, flattenDeep, compact } from "lodash";
import {
    getCollections,
    lookupCollectionByIdentifier,
    createCollection,
    linkCollectionToUser,
    deleteCollection,
    toggleCollectionVisibility,
} from "../lib/collection";
const log = getLogger();

async function verifyCollectionAccess(req, res, next) {
    let collection = await lookupCollectionByIdentifier({
        identifier: req.params.identifier,
        userId: req.session.user.id,
    });
    if (!collection) {
        return next(new ForbiddenError(`You don't have permission to access this endpoint`));
    }
    req.collection = collection;
    next();
}
function routeCollection(handler) {
    return compact(flattenDeep([...route(), verifyCollectionAccess, handler]));
}

export function setupRoutes({ server }) {
    // user routes
    server.get("/collections", route(getCollectionsHandler));
    server.get("/collections/:identifier", routeCollection(getCollectionHandler));
    server.post("/collections", route(postCollectionHandler));
    server.put(
        "/collections/:identifier/attach-user",
        routeCollection(putCollectionInviteUserHandler)
    );
    server.put(
        "/collections/:identifier/detach-user",
        routeCollection(putCollectionDetachUserHandler)
    );
    server.put(
        "/collections/:identifier/toggle-visibility",
        routeCollection(putCollectionToggleVisibility)
    );
    server.get("/collections/:identifier/users", routeCollection(getCollectionUsers));
    server.del("/collections/:identifier", routeCollection(deleteCollectionHandler));
}

async function getCollectionsHandler(req, res, next) {
    const userId = req.session.user.id;
    const offset = req.query.offset;
    const limit = req.query.limit;
    let { count, rows } = await getCollections({ userId, offset, limit });
    let collections = rows.map((c) => ({ name: c.identifier, private: c.data.private }));

    res.send({ total: count, collections });
    next();
}

async function getCollectionHandler(req, res, next) {
    res.send({ collection: req.collection });
    next();
}

async function postCollectionHandler(req, res, next) {
    if (!req.body.identifier) {
        return next(new BadRequestError(`collection identifier not defined`));
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
            return next(new ForbiddenError(`That identifier is already taken`));
        }
    }

    res.send({ collection: collection.get() });
    next();
}

async function putCollectionInviteUserHandler(req, res, next) {
    let user = await models.user.findOne({ where: { email: req.params.email } });
    if (!user) {
        return next(new NotFoundError());
    }
    try {
        await linkCollectionToUser({ collectionId: req.collection.id, userId: user.id });
        await logEvent({
            level: "info",
            owner: req.session.user.email,
            text: `User '${req.session.user.email}' invited '${user.email}' to '${req.collection.identifier}'`,
        });
        res.send({});
        next();
    } catch (error) {
        return next(new InternalServerError());
    }
}

async function putCollectionDetachUserHandler(req, res, next) {
    let user = await models.user.findOne({ where: { id: req.params.userId } });
    if (user.administrator) {
        return next(new ForbiddenError());
    }

    try {
        await req.collection.removeUser([user]);
        res.send({});
        next();
    } catch (error) {
        return next(new InternalServerError());
    }
}

async function putCollectionToggleVisibility(req, res, next) {
    try {
        await toggleCollectionVisibility({ collectionId: req.collection.id });
        res.send({});
        next();
    } catch (error) {
        return next(new InternalServerError());
    }
}

async function getCollectionUsers(req, res, next) {
    let users = await req.collection.getUsers();
    users = users.map((u) => {
        return {
            ...["id", "email", "givenName", "familyName", "administrator"].map((a) => ({
                [a]: u[a],
            })),
            loggedin: req.session.user.id === u.id ? true : false,
        };
    });
    res.send({ users });
    next();
}

async function deleteCollectionHandler(req, res, next) {
    try {
        await deleteCollection({ id: req.collection.id });
        let { bucket } = await getS3Handle();
        await bucket.removeObjects({ prefix: req.collection.identifier });
        await logEvent({
            level: "info",
            owner: req.session.user.email,
            text: `User deleted item '${req.collection.identifier}'`,
        });
    } catch (error) {
        log.error(`Error deleting collection with id: '${req.collection.identifier}'`);
        return next(new InternalServerError());
    }
    res.send({});
    next();
}
