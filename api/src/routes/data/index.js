import { getLogger } from "../../common/logger.js";
import { submitTask } from "../../common/task.js";
import { getStoreHandle } from "../../common/getS3Handle.js";
import { requireItemAccess, demandAuthenticatedUser } from "../../common/middleware.js";
const log = getLogger();
import { differenceInMinutes } from "date-fns";
import { getItemResourceLink } from "../../lib/item.js";

import { authenticateTusRequest, triggerProcessing, getUploadDetails } from "./upload.js";

export function setupRoutes(fastify, options, done) {
    fastify.addHook("preHandler", demandAuthenticatedUser);

    fastify.get(
        "/upload/pre-create/:itemType/:identifier",
        { preHandler: requireItemAccess },
        getUploadDetails
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
    fastify.post(
        "/process/assemble-tei/:identifier",
        { preHandler: requireItemAccess },
        assembleTeiHandler
    );
    done();
}

async function extractTableHandler(req) {
    const { identifier, resource } = req.params;

    const teiFile = `${resource}.tei.xml`;
    const textractFile = `${resource}.textract_ocr-ADMIN.json`;
    const imageFile = `${resource}.jpg`;

    let store = await getStoreHandle({ id: identifier, type: "item" });
    await store.delete({ target: teiFile });
    await store.delete({ target: textractFile });
    const name = "extract-table";

    log.info(`Process extract table: ${identifier}/${resource}`);
    let task = await submitTask({
        rabbit: this.rabbit,
        configuration: req.session.configuration,
        item: req.session.item,
        name,
        body: { resource: imageFile },
    });

    return { taskId: task.id };
}

async function assembleTeiHandler(req) {
    const { identifier } = req.params;

    // see if we have a transcription that is less than 30 minutes old
    //   if we do - return a link to that
    const store = await getStoreHandle({ identifier, type: "item" });
    let fileStat = await store.stat({ path: `${identifier}-tei-complete.xml` });
    const now = new Date();
    if (differenceInMinutes(now, fileStat.LastModified) < 30) {
        let link = await getItemResourceLink({
            identifier,
            resource: `${identifier}-tei-complete.xml`,
            download: true,
        });
        return { link };
    } else {
        const name = "assemble-tei-document";
        log.info(`Process assemble tei: ${identifier}`);
        let task = await submitTask({
            rabbit: this.rabbit,
            configuration: req.session.configuration,
            item: req.session.item,
            name,
            body: {},
        });

        return { taskId: task.id };
    }
}
