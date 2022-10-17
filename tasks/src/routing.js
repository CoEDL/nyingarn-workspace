import {
    createImageThumbnail,
    createWebFormats,
    runTextractOCR,
    processDigivolTranscription,
    processTeiTranscription,
    prepare,
    cleanup,
    syncToBucket,
    cleanupAfterFailure,
} from "./tasks";
import { getLogger, updateTask, deleteTask } from "./common";
const log = getLogger();

export function setupHandlers({ rabbit }) {
    rabbit.handle("process-image", runTask);
    rabbit.handle("process-digivol", runTask);
    rabbit.handle("process-tei", runTask);
    rabbit.handle("extract-table", runTask);
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
            case "process-tei":
                log.info(`Running 'process-tei' task for '${identifier}' in ${directory}`);
                //await processFtpTeiTranscription({ directory, ...msg.body });
                await processTeiTranscription({ directory, ...msg.body });
                break;
            case "process-image":
                log.info(`Running 'process-image' task for '${identifier}' in ${directory}`);
                await createImageThumbnail({ directory, identifier, resource });
                await syncToBucket({ directory, identifier });
                await createWebFormats({ directory, identifier, resource });
                await syncToBucket({ directory, identifier });
                await runTextractOCR({ directory, identifier, resource });
                break;
            case "extract-table":
                log.info(`Running 'extract-table' task for '${identifier}' in ${directory}`);
                await runTextractOCR({ task: "table", directory, identifier, resource });
                break;
        }

        await cleanup({ directory, identifier });

        if (task.id) {
            await updateTask({
                taskId: task.id,
                status: "done",
            });
        }
    } catch (error) {
        log.error(`runTask ERROR: Task in ${directory}: ${error.message}`);
        try {
            await cleanupAfterFailure({ directory, identifier });
            if (task.id) {
                const data = {
                    name: error.name,
                    code: error.code,
                    message: error.message,
                };
                if (error.url) data.url = error.url;
                if (error.errorObject) data.sourceType = error.errorObject["source-type"];
                if (error.xsltLineNr) data.xsltLineNumber = error.xsltLineNr;
                if (error.xsltModule) data.xsltModule = error.xsltModule;
                await updateTask({
                    taskId: task.id,
                    data,
                    status: "failed",
                });
            }
        } catch (error) {
            console.log(error);
        }
    }
    msg.ack();
}
