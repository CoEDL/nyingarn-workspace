import { getLogger } from "./logger.js";
import { getUser } from "../lib/user.js";
import { verifyToken } from "./jwt.js";
import { lookupItemByIdentifier } from "../lib/item.js";
<<<<<<< HEAD
=======
import { lookupCollectionByIdentifier } from "../lib/collection.js";
>>>>>>> implement-publish-flow
const log = getLogger();

export async function demandAuthenticatedUser(req, res) {
    if (!req.headers.authorization) {
        return res.unauthorized();
    }
    try {
        let user = await verifyToken({
            token: req.headers.authorization.split("Bearer ")[1],
            configuration: req.session.configuration,
        });
        user = await getUser({ userId: user.id });
        if (!user) {
            return res.unauthorized();
        }
        req.session.user = user;
    } catch (error) {
        return res.unauthorized();
    }
}

export async function demandAdministrator(req, res) {
    if (!req.session.user.administrator) {
        return res.forbidden();
    }
}

export async function requireCollectionAccess(req, res) {
    if (!req.params.identifier) {
        return res.badRequest(`Identifier not defined`);
    }

<<<<<<< HEAD
    try {
        let collection = await lookupCollectionByIdentifier({
=======
    let collection;
    try {
        collection = await lookupCollectionByIdentifier({
>>>>>>> implement-publish-flow
            identifier: req.params.identifier,
            userId: req.session.user.id,
        });
        if (!collection) {
            return res.forbidden(`You don't have permission to access this endpoint`);
        }
    } catch (error) {
        return res.forbidden(`You don't have permission to access this endpoint`);
    }
    req.session.collection = collection;
}

export async function requireItemAccess(req, res) {
    if (!req.body?.identifier && !req.params?.identifier) {
<<<<<<< HEAD
        return res.badRequest(`No identifier defined in body or params`);
=======
        return res.badRequest(`Identifier not defined`);
>>>>>>> implement-publish-flow
    }
    const identifier = req.body?.identifier ? req.body?.identifier : req.params?.identifier;
    let item;
    try {
        item = await lookupItemByIdentifier({
            identifier,
            userId: req.session.user.id,
        });
        if (!item) {
            return res.forbidden(`You don't have permission to access this endpoint`);
        }
    } catch (error) {
        return res.forbidden(`You don't have permission to access this endpoint`);
    }
    req.session.item = item;
}
