import { UnauthorizedError, ForbiddenError } from "restify-errors";
import { getLogger } from "./common/logger";
import models from "./models";
const log = getLogger();

export function route(handler) {
    return [demandKnownApplication, handler];
}

export async function demandKnownApplication(req, res, next) {
    if (!req.headers.authorization) {
        log.error(`demandKnownApplication: Authorization header not present in request`);
        return next(new UnauthorizedError());
    }
    let application = await models.application.findOne({
        where: { secret: req.headers.authorization },
    });
    if (!application) {
        return next(new UnauthorizedError());
    }
    req.session = {
        application: application.get(),
    };
    return next();
}
