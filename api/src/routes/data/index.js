import {
    getLogger,
    requireItemAccess,
    demandAuthenticatedUser,
    getStoreHandle,
    submitTask,
} from "../../common/index.js";
const log = getLogger();

import { authenticateTusRequest, triggerProcessing, getItemPath } from "./upload.js";

export function setupRoutes(fastify, options, done) {
    fastify.addHook("preHandler", demandAuthenticatedUser);

    fastify.get("/upload/pre-create", authenticateTusRequest);
    fastify.get(
        "/upload/pre-create/:itemType/:identifier",
        { preHandler: requireItemAccess },
        getItemPath
    );
    fastify.get(
        "/upload/post-finish/:identifier/:resource",
        { preHandler: requireItemAccess },
        triggerProcessing
    );
    fastify.post(
        "/process/post-finish/:identifier/:resource",
        { preHandler: requireItemAccess },
        triggerProcessing
    );
    fastify.post(
        "/process/extract-table/:identifier/:resource",
        { preHandler: requireItemAccess },
        extractTableHandler
    );
    done();
}

async function extractTableHandler(req) {
    const { identifier, resource } = req.params;

    const teiFile = `${resource}.tei.xml`;
    const textractFile = `${resource}.textract_ocr-ADMIN.json`;
    const imageFile = `${resource}.jpg`;

    let store = await getStoreHandle({ id: identifier, className: "item" });
    await store.delete({ target: teiFile });
    await store.delete({ target: textractFile });
    const name = "extract-table";

    log.info(`Process: ${identifier}/${resource}`);
    let task = await submitTask({
        rabbit: this.rabbit,
        configuration: req.session.configuration,
        item: req.session.item,
        name,
        body: { resource: imageFile },
    });

    return { taskId: task.id };
}
