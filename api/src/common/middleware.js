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

export async function requireIdentifierAccess(req, res, next) {
    if (!req.body?.identifier && !req.params?.identifier) {
        return res.badRequest(`No identifier defined in body or params`);
    }
    const identifier = req.body?.identifier ? req.body?.identifier : req.params?.identifier;
    let item = await lookupItemByIdentifier({
        userId: req.session.user.id,
        identifier: identifier,
    });
    if (!item) {
        return res.forbidden(`You don't have access to that item`);
    }
    req.item = item;
    next();
}
