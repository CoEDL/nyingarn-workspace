import { UnauthorizedError, ForbiddenError } from "restify-errors";
import { getLogger } from "./common/logger";
import models from "./models";
const log = getLogger();

export function route(handler) {
    return [handler];
}
