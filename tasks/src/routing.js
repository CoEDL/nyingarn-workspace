import path from "path";
import { createImageThumbnail, createWebFormats } from "./tasks/image-processing.js";
import { runTextractOCR } from "./tasks/ocr-processing.js";
import {
    processDigivolTranscription,
    processTeiTranscription,
} from "./tasks/transcription-processing.js";
import { assembleTeiDocument } from "./tasks/assemble-tei.js";
import {
    prepare,
    cleanup,
    cleanupAfterFailure,
    syncToBucket,
    removeOverlappingNewContent,
} from "./tasks/index.js";
import { log, getStoreHandle } from "/srv/api/src/common/index.js";
import { updateTask, deleteTask } from "./common/task.js";

export function setupHandlers({ rabbit }) {
    rabbit.handle("*", runTask);
}

export async function runTask(msg) {
    // if (process.env.NODE_ENV === "development") msg.ack();
    let directory;

    const { task, identifier, resource, overwrite } = msg.body;
    try {
        directory = await prepare({ task, identifier, resource });

        switch (task.name) {
            case "process-digivol":
                log.info(`Running 'process-digivol' task for '${identifier}' in ${directory}`);
                await processDigivolTranscription({ directory, ...msg.body });
                await removeOverlappingNewContent({ directory, identifier });
                break;
            case "process-tei":
                log.info(`Running 'process-tei' task for '${identifier}' in ${directory}`);
                await processTeiTranscription({ directory, ...msg.body });
                if (!overwrite) await removeOverlappingNewContent({ directory, identifier });
                break;
            case "process-image":
                log.info(`Running 'process-image' task for '${identifier}' in ${directory}`);
                await createImageThumbnail({ directory, identifier, resource });
                await syncToBucket({ directory, identifier });
                await createWebFormats({ directory, identifier, resource });
                await syncToBucket({ directory, identifier });
                await runTextractOCR({ directory, identifier, resource });
                break;
            case "process-image-without-ocr":
                log.info(
                    `Running 'process-image-without-ocr' task for '${identifier}' in ${directory}`
                );
                await createImageThumbnail({ directory, identifier, resource });
                await syncToBucket({ directory, identifier });
                await createWebFormats({ directory, identifier, resource });
                await syncToBucket({ directory, identifier });
                break;
            case "extract-table":
                log.info(`Running 'extract-table' task for '${identifier}' in ${directory}`);
                await runTextractOCR({ task: "table", directory, identifier, resource });
                break;
            case "assemble-tei-document":
                log.info(
                    `Running 'assemble-tei-document' task for '${identifier}' in ${directory}`
                );
                let store = await getStoreHandle({ id: identifier, type: "item" });
                let resources = await store.listResources();
                const re = new RegExp(`${identifier}-.*.tei.xml`);
                resources = resources
                    .filter((r) => {
                        return r.Key.match(re) || r.Key === "ro-crate-metadata.json";
                    })
                    .map((r) => r.Key);
                for (let resource of resources) {
                    await store.get({
                        target: resource,
                        localPath: path.join(directory, resource),
                    });
                }
                await store.delete({ target: `${identifier}-tei-complete.xml` });
                await assembleTeiDocument({ task, identifier, directory });
                await removeOverlappingNewContent({ directory, identifier });

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
        console.log(error);
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
