import { createImageThumbnail, createWebFormats, runOCR } from "../tasks";
import { prepare, cleanup, cleanupAfterFailure, getLogger, updateTask } from "../common";
const log = getLogger();

export function setupHandlers({ rabbit }) {
    rabbit.handle("CreateImageThumbnail", runTask);
    rabbit.handle("CreateWebFormats", runTask);
    rabbit.handle("RunOCR", runTask);
}

export async function runTask(msg) {
    // if (process.env.NODE_ENV === "development") msg.ack();
    let directory;

    const { task } = msg.body;
    try {
        directory = await prepare({ ...msg.body });

        switch (task) {
            case "CreateImageThumbnail":
                log.debug(`Running 'createImageThumbnail' task in ${directory}`);
                await createImageThumbnail({ directory, ...msg.body });
                break;
            case "CreateWebFormats":
                log.debug(`Running 'createWebFormats' task in ${directory}`);
                await createWebFormats({ directory, ...msg.body });
                break;
            case "RunOCR":
                log.debug(`Running 'runOCR' task in ${directory}`);
                await runOCR({ directory, ...msg.body });
                break;
        }

        await cleanup({ identifier: msg.body.identifier, directory });
        await updateTask({ taskId: msg.body.taskId, status: "done" });
    } catch (error) {
        log.error(`runTask ERROR: ${error.message}`);
        await cleanupAfterFailure({ identifier: msg.body.identifier, directory });
        await updateTask({ taskId: msg.body.taskId, status: "failed" });
    }
    msg.ack();
}
