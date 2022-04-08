import {
    createImageThumbnail,
    createWebFormats,
    runTesseractOCR,
    runTextractOCR,
    processDigivolTranscription,
    //    processFtpTeiTranscription,
    processTeiTranscription,
} from "./tasks";
import {
    prepare,
    cleanup,
    syncToBucket,
    cleanupAfterFailure,
    getLogger,
    updateTask,
    deleteTask,
} from "./common";
const log = getLogger();

export function setupHandlers({ rabbit }) {
    rabbit.handle("process-image", runTask);
    rabbit.handle("process-digivol", runTask);
    rabbit.handle("process-tei", runTask);
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
        }

        await cleanup({ directory, identifier });

        if (task.id) {
            await updateTask({
                taskId: task.id,
                status: "done",
            });
        }
    } catch (error) {
        log.error(`runTask ERROR: Task in ${directory}`);
        try {
            await cleanupAfterFailure({ directory, identifier });
            if (task.id) {
                await updateTask({
                    taskId: task.id,
                    data: { error: error.message },
                    status: "failed",
                });
            }
        } catch (error) {}
    }
    msg.ack();
}
