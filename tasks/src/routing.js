import { createImageThumbnail, createWebFormats, runOCR } from "./tasks";
import { prepare, cleanup, cleanupAfterFailure, getLogger, updateTask } from "./common";
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

    const { task } = msg.body;
    try {
        directory = await prepare({ ...msg.body });

        switch (task) {
            case "create-thumbnails":
                log.debug(`Running '/process/thumbnails' task in ${directory}`);
                await createImageThumbnail({ directory, ...msg.body });
                break;
            case "create-web-formats":
                log.debug(`Running 'createWebFormats' task in ${directory}`);
                await createWebFormats({ directory, ...msg.body });
                break;
            case "run-ocr":
                log.debug(`Running 'runOCR' task in ${directory}`);
                await runOCR({ directory, ...msg.body });
                break;
        }

        await cleanup({ identifier: msg.body.identifier, directory });

        if (msg.body.stages && process.env.POST_FINISH) {
            log.debug("next stages to run", msg.body.stages);
            let url = `${process.env.POST_FINISH}/${msg.body.identifier}`;
            await fetch(url, {
                method: "POST",
                headers: msg.body.headers,
                body: JSON.stringify({ stages: msg.body.stages }),
            });
        }
        if (msg.body.taskId) {
            await updateTask({ taskId: msg.body.taskId, status: "done" });
        }
    } catch (error) {
        log.error(`runTask ERROR: ${error.message}`);
        await cleanupAfterFailure({ identifier: msg.body.identifier, directory });
        if (msg.body.taskId) {
            await updateTask({ taskId: msg.body.taskId, status: "failed" });
        }
    }
    msg.ack();
}
