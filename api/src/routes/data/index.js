import { route, getLogger, requireIdentifierAccess, demandAuthenticatedUser } from "../../common";
export const log = getLogger();

import { authenticateTusRequest, triggerProcessing } from "./upload";

function routeProcessingAction(req, res, next) {
    req.body.stages = [req.path()];
    next();
}

function routeProcessing(handler) {
    return [demandAuthenticatedUser, requireIdentifierAccess, routeProcessingAction, handler];
}

export function setupRoutes({ server }) {
    server.get("/upload/pre-create", route(authenticateTusRequest));
    server.get("/upload/post-finish/:identifier/:resource", route(triggerProcessing));
    server.post("/process/post-finish/:identifier/:resource", route(triggerProcessing));
    server.post("/process/*", routeProcessing(triggerProcessing));
}
