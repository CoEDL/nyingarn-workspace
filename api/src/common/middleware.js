import { UnauthorizedError, ForbiddenError } from "restify-errors";
import { getLogger, loadConfiguration, verifyToken } from "./";
import { lookupItemByIdentifier } from "../lib/item";
const log = getLogger();

export function route(handler) {
    return [demandAuthenticatedUser, handler];
}

export function routeAdmin(handler) {
    return [demandAuthenticatedUser, demandAdministrator, handler];
}

export async function demandAuthenticatedUser(req, res, next) {
    if (!req.headers.authorization) {
        return next(new UnauthorizedError());
    }
    const configuration = await loadConfiguration();
    try {
        let user = await verifyToken({
            token: req.headers.authorization.split("Bearer ")[1],
            configuration,
        });
        req.session = {
            user,
        };
    } catch (error) {
        return next(new UnauthorizedError());
    }
    next();
}

export async function demandAdministrator(req, res, next) {
    if (!req.session.user.administrator) {
        return next(new ForbiddenError());
    }
    next();
}

export async function requireIdentifierAccess(req, res, next) {
    if (!req.body?.identifier && !req.params?.identifier) {
        return next(new ForbiddenError(`No identifier defined in body or params`));
    }
    const identifier = req.body?.identifier ? req.body?.identifier : req.params?.identifier;
    let item = await lookupItemByIdentifier({
        userId: req.session.user.id,
        identifier: identifier,
    });
    if (!item) {
        return next(new ForbiddenError(`You don't have access to that item`));
    }
    req.item = item;
    next();
}
