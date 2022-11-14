export { createImageThumbnail, createWebFormats } from "./image-processing.js";
export { runTesseractOCR, runTextractOCR } from "./ocr-processing.js";
export {
    processDigivolTranscription,
    processFtpTeiTranscription,
    processTeiTranscription,
} from "./transcription-processing.js";
export { assembleTeiDocument } from "./assemble-tei.js";

import path from "path";
import { getLogger, getStoreHandle } from "../common";
import { ensureDir, remove, pathExists, readdir } from "fs-extra";
import { walk } from "@root/walk";
const log = getLogger();

export const imageExtensions = ["jpe?g", "png", "webp", "tif{1,2}"];
export const thumbnailHeight = 300;
export const webFormats = [{ ext: "jpg", match: "jpe?g" }, "webp"];
export const specialFiles = ["ro-crate-metadata.json", "nocfl.", "-digivol.csv", "-tei.xml"];

export async function removeOverlappingNewContent({ directory, identifier, className = "item" }) {
    let store = await getStoreHandle({ id: identifier, className });
    let storeResources = (await store.listResources()).map((r) => r.Key);

    directory = path.join(directory, identifier);
    await walk(directory, async (err, pathname, dirent) => {
        if (dirent.isFile()) {
            if (storeResources.includes(path.relative(directory, pathname))) {
                await remove(pathname);
            }
        }
    });
}

export async function prepare({ task, identifier, resource, className = "item" }) {
    let store = await getStoreHandle({ id: identifier, className });
    const directory = await ensureDir(path.join("/tmp", task.id, identifier));
    log.debug(`Setting up task to run in directory: ${directory}.`);

    await store.get({ target: resource, localPath: path.join(directory, identifier, resource) });
    return directory;
}

export async function cleanup({ directory, identifier, className = "item" }) {
    log.debug(`Task in ${directory} completed successfully.`);
    await syncToBucket({ directory, identifier, className });

    if (await pathExists(directory)) {
        await remove(directory);
    }
    log.debug(`Task in ${directory} complete.`);
}

export async function cleanupAfterFailure({ directory }) {
    log.debug(`Task in ${directory} failed. Cleaning up.`);
    // await syncToBucket({ directory, identifier });

    if (await pathExists(directory)) {
        await remove(directory);
    }
}

export async function syncToBucket({ directory, identifier, className = "item" }) {
    log.debug(`Sync'ing back to bucket.`);
    let store = await getStoreHandle({ id: identifier, className });
    directory = path.join(directory, identifier);

    let batch = [];

    await walk(directory, async (err, pathname, dirent) => {
        if (dirent.isFile()) {
            log.debug(`Uploading: ${path.relative(directory, pathname)} to the store`);
            batch.push({ localPath: pathname, target: path.relative(directory, pathname) });
        }
    });
    await store.put({ batch });
}
