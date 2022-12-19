import { getLogger } from "./logger.js";
import { verifyToken } from "./jwt.js";
import { lookupItemByIdentifier } from "../lib/item.js";
const log = getLogger();

export function route(handler) {
    return [demandAuthenticatedUser, handler];
}

export function routeAdmin(handler) {
    return [demandAuthenticatedUser, demandAdministrator, handler];
}

export async function demandAuthenticatedUser(req, res) {
    if (!req.headers.authorization) {
        return res.unauthorized();
    }
    try {
        let user = await verifyToken({
            token: req.headers.authorization.split("Bearer ")[1],
            configuration: req.session.configuration,
        });
<<<<<<< Updated upstream
=======
        user = await getUser({ userId: user.id });
        if (!user) {
            return res.unauthorized();
        }
>>>>>>> Stashed changes
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

<<<<<<< Updated upstream
export async function requireIdentifierAccess(req, res) {
=======
export async function requireCollectionAccess(req, res) {
    if (!req.params.identifier) {
        return res.badRequest(`Identifier not defined`);
    }

    try {
        let collection = await lookupCollectionByIdentifier({
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
>>>>>>> Stashed changes
    if (!req.body?.identifier && !req.params?.identifier) {
        return res.badRequest(`No identifier defined in body or params`);
    }
    const identifier = req.body?.identifier ? req.body?.identifier : req.params?.identifier;
<<<<<<< Updated upstream
    let item = await lookupItemByIdentifier({
        userId: req.session.user.id,
        identifier: identifier,
    });
    if (!item) {
        return res.forbidden(`You don't have access to that item`);
=======
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
>>>>>>> Stashed changes
    }
    req.session.item = item;
}
