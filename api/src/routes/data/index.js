import {
    route,
    getLogger,
    requireIdentifierAccess,
    demandAuthenticatedUser,
    getStoreHandle,
    submitTask,
} from "../../common";
export const log = getLogger();

import { authenticateTusRequest, triggerProcessing, getItemPath } from "./upload";

function routeProcessing(handler) {
    return [demandAuthenticatedUser, requireIdentifierAccess, handler];
}

export function setupRoutes({ server }) {
    server.get("/upload/pre-create", route(authenticateTusRequest));
    server.get("/upload/pre-create/:itemType/:identifier", route(getItemPath));
    server.get("/upload/post-finish/:identifier/:resource", routeProcessing(triggerProcessing));
    server.post("/process/post-finish/:identifier/:resource", routeProcessing(triggerProcessing));
    server.post(
        "/process/extract-table/:identifier/:resource",
        routeProcessing(extractTableHandler)
    );
}

async function extractTableHandler(req, res, next) {
    let teiFile = `${req.params.resource}.tei.xml`;
    let textractFile = `${req.params.resource}.textract_ocr-ADMIN.json`;
    req.params.resource = `${req.params.resource}.jpg`;

    let store = await getStoreHandle({ id: req.params.identifier, className: "item" });
    await store.delete({ target: teiFile });
    await store.delete({ target: textractFile });

    const identifier = req.params.identifier;
    const resource = req.params.resource;
    const name = "extract-table";

    log.info(`Process: ${identifier}/${resource}`);
    let task = await submitTask({
        name,
        item: req.item,
        body: { resource },
    });

    res.send({ taskId: task.id });
    next();
}
