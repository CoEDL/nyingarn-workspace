import { UnauthorizedError, ForbiddenError } from "restify-errors";
import { getLogger } from "./common/logger";
const log = getLogger();

export async function demandKnownApplication(req, res, next) {
    if (!req.headers.authorization) {
        log.error(`demandKnownApplication: Authorization header not preset in request`);
        return next(new UnauthorizedError());
    }
    // let [authType, token] = req.headers.authorization.split(" ");
    // if (!expectedAuthorizationTypes.includes(authType)) {
    //     log.error(
    //         `demandKnownUser: unknown authorization presented: expected okta || sid got authType`
    //     );
    //     return next(new UnauthorizedError());
    // }
    return next();
}
