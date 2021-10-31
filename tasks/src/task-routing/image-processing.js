import { createImageThumbnail } from "../tasks";
import { prepare, cleanup, cleanupAfterFailure, getLogger, updateTask } from "../common";
const log = getLogger();

export function setupHandlers({ rabbit }) {
    rabbit.handle("CreateImageThumbnail", createImageThumbnailHandler);
}

export async function createImageThumbnailHandler(msg) {
    let directory;
    try {
        directory = await prepare({ ...msg.body });
        log.debug(`Running 'createImageThumbnail' task in ${directory}`);
        await createImageThumbnail({ directory, files: msg.body.files });
        await cleanup({ identifier: msg.body.identifier, directory });
        await updateTask({ taskId: msg.body.taskId, status: "done" });
    } catch (error) {
        log.error(`createImageThumbnailHandler ERROR: ${error.message}`);
        await cleanupAfterFailure({ identifier: msg.body.identifier, directory });
        await updateTask({ taskId: msg.body.taskId, status: "failed" });
    }
    msg.ack();
}
