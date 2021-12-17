import {
    createImageThumbnail,
    createWebFormats,
    runOCR,
    processDigivolTranscription,
} from "./tasks";
import { prepare, cleanup, cleanupAfterFailure, getLogger, updateTask, deleteTask } from "./common";
const log = getLogger();
import path from "path";
import { readdir } from "fs-extra";

export function setupHandlers({ rabbit }) {
    rabbit.handle("process-image", runTask);
    rabbit.handle("process-digivol", runTask);
}

export async function runTask(msg) {
    // if (process.env.NODE_ENV === "development") msg.ack();
    let directory;

    const { task, identifier, resource } = msg.body;
    try {
        directory = await prepare({ task, identifier, resource });

        switch (task.name) {
            case "process-digivol":
                log.info(`Running 'process-digivol' task for '${identifier}' in ${directory}`);
                await processDigivolTranscription({ directory, ...msg.body });
                break;
            case "process-image":
                log.info(`Running 'process-image' task for '${identifier}' in ${directory}`);
                await createImageThumbnail({ directory, identifier, resource });
                await createWebFormats({ directory, identifier, resource });
                await runOCR({ directory, identifier, resource });
                break;
        }

        await cleanup({ directory, identifier });

        if (task.id) {
            // await deleteTask({ taskId });
            await updateTask({
                taskId: task.id,
                status: "done",
            });
        }
    } catch (error) {
        log.error(`runTask ERROR: ${error.message}`);
        await cleanupAfterFailure({ directory, identifier });
        if (taskId) {
            await updateTask({
                taskId: task.id,
                data: { error: error.message },
                status: "failed",
            });
        }
    }
    msg.ack();
}
