import { UnauthorizedError, ForbiddenError } from "restify-errors";
import { getLogger } from "./common/logger";
const log = getLogger();
import { loadConfiguration } from "./common";
import { verifyToken } from "./lib/jwt";

export function route(handler) {
    return [demandAuthenticatedUser, handler];
}

async function demandAuthenticatedUser(req, res, next) {
    if (!req.headers.authorization) {
        return next(new UnauthorizedError());
    }
    const configuration = await loadConfiguration();
    try {
        let data = await verifyToken({
            token: req.headers.authorization.split("Bearer ")[1],
            configuration,
        });
    } catch (error) {
        throw next(new UnauthorizedError());
    }
    next();
}
