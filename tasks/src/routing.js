import { createImageThumbnail, createWebFormats, runOCR } from "./tasks";
import { prepare, cleanup, cleanupAfterFailure, getLogger, updateTask, deleteTask } from "./common";
const log = getLogger();
import fetch from "node-fetch";

export function setupHandlers({ rabbit }) {
    rabbit.handle("create-thumbnails", runTask);
    rabbit.handle("create-web-formats", runTask);
    rabbit.handle("run-ocr", runTask);
}

export async function runTask(msg) {
    // if (process.env.NODE_ENV === "development") msg.ack();
    let directory;

    const { task, identifier, taskId, headers, stages } = msg.body;
    try {
        directory = await prepare({ ...msg.body });

        switch (task) {
            case "create-thumbnails":
                log.info(`Running 'create-thumbnails' task for '${identifier}' in ${directory}`);
                await createImageThumbnail({ directory, ...msg.body });
                break;
            case "create-web-formats":
                log.info(`Running 'create-web-formats' task for '${identifier}' in ${directory}`);
                await createWebFormats({ directory, ...msg.body });
                break;
            case "run-ocr":
                log.info(`Running 'run-ocr' task for '${identifier}' in ${directory}`);
                await runOCR({ directory, ...msg.body });
                break;
        }

        await cleanup({ identifier, directory });

        if (stages && process.env.POST_FINISH) {
            log.info("next stages to run", stages);
            let url = `${process.env.POST_FINISH}/${identifier}`;
            await fetch(url, {
                method: "POST",
                headers: headers,
                body: JSON.stringify({ stages }),
            });
        }
        if (taskId) {
            await deleteTask({ taskId });
        }
    } catch (error) {
        log.error(`runTask ERROR: ${error.message}`);
        await cleanupAfterFailure({ identifier: msg.body.identifier, directory });
        if (taskId) {
            await updateTask({
                taskId,
                data: { error: error.message },
                status: "failed",
            });
        }
    }
    msg.ack();
}
