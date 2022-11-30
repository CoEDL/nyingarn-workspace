import {
    getLogger,
    requireIdentifierAccess,
    demandAuthenticatedUser,
    getStoreHandle,
    submitTask,
} from "../../common/index.js";
const log = getLogger();

import { authenticateTusRequest, triggerProcessing, getItemPath } from "./upload.js";

export function setupRoutes(fastify, options, done) {
    fastify.addHook("preHandler", demandAuthenticatedUser);
    fastify.addHook("preHandler", requireIdentifierAccess);

    fastify.get("/upload/pre-create", authenticateTusRequest);
    fastify.get("/upload/pre-create/:itemType/:identifier", getItemPath);
    fastify.get("/upload/post-finish/:identifier/:resource", triggerProcessing);
    fastify.post("/process/post-finish/:identifier/:resource", triggerProcessing);
    fastify.post("/process/extract-table/:identifier/:resource", extractTableHandler);
    done();
}

async function extractTableHandler(req) {
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

    return { taskId: task.id };
}
