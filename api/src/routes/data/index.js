import { route, getLogger, requireIdentifierAccess, demandAuthenticatedUser } from "../../common";
export const log = getLogger();

import { authenticateTusRequest, triggerProcessing } from "./upload";
import {
    processThumbnailsRouteHandler,
    processOcrRouteHandler,
    processWebFormatsRouteHandler,
} from "./process";

function routeProcessing(handler) {
    return [demandAuthenticatedUser, requireIdentifierAccess, handler];
}

export function setupRoutes({ server }) {
    server.get("/upload/pre-create", route(authenticateTusRequest));
    server.get("/upload/post-finish/:identifier", route(triggerProcessing));
    server.post("/process/post-finish/:identifier", route(triggerProcessing));
    server.post("/process/thumbnails", routeProcessing(processThumbnailsRouteHandler));
    server.post("/process/webformats", routeProcessing(processWebFormatsRouteHandler));
    server.post("/process/ocr", routeProcessing(processOcrRouteHandler));
}
