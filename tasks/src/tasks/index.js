import path from "path";
import { log } from "/srv/api/src/common/logger.js";
import { getStoreHandle } from "/srv/api/src/common/getS3Handle.js";
import fsExtraPkg from "fs-extra";
const { ensureDir, remove, pathExists, readdir } = fsExtraPkg;
import { walk } from "@root/walk";

export const imageExtensions = ["jpe?g", "png", "webp", "tif{1,2}"];
export const thumbnailHeight = 300;
export const webFormats = [{ ext: "jpg", match: "jpe?g" }, "webp"];
export const specialFiles = ["ro-crate-metadata.json", "nocfl.", "-digivol.csv", "-tei.xml"];

export async function removeOverlappingNewContent({ directory, identifier, type = "item" }) {
    let store = await getStoreHandle({ id: identifier, type });
    let storeResources = (await store.listResources()).map((r) => r.Key);

    await walk(directory, async (err, pathname, dirent) => {
        if (dirent.isFile()) {
            if (storeResources.includes(path.relative(directory, pathname))) {
                await remove(pathname);
            }
        }
    });
}

export async function prepare({ task, identifier, resource, type = "item" }) {
    const directory = path.join("/tmp", task.id, identifier);
    await ensureDir(directory);
    log.debug(`Setting up task to run in directory: ${directory}.`);

    if (resource) {
        let store = await getStoreHandle({ id: identifier, type });
        await store.get({
            target: resource,
            localPath: path.join(directory, resource),
        });
    }
    return directory;
}

export async function cleanup({ directory, identifier, type = "item" }) {
    log.debug(`Task in ${directory} completed successfully.`);
    await syncToBucket({ directory, identifier, type });

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

export async function syncToBucket({ directory, identifier, type = "item" }) {
    log.debug(`Sync'ing back to bucket.`);
    let store = await getStoreHandle({ id: identifier, type });

    let batch = [];

    await walk(directory, async (err, pathname, dirent) => {
        if (dirent.isFile()) {
            log.debug(`Uploading: ${path.relative(directory, pathname)} to the store`);
            batch.push({ localPath: pathname, target: path.relative(directory, pathname) });
        }
    });
    await store.put({ batch });
}
