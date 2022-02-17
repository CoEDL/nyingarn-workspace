import { getS3Handle } from "./";
import { getLogger } from "./logger";
import { ensureDir, remove, pathExists } from "fs-extra";
import crypto from "crypto";
import path from "path";
const log = getLogger();

export async function prepare({ task, identifier, resource }) {
    let { bucket } = await getS3Handle();
    const directory = await ensureDir(path.join("/tmp", task.id));
    log.debug(`Setting up task to run in directory: ${directory}.`);

    await bucket.downloadFileToFolder({
        file: path.join(identifier, resource),
        localPath: directory,
    });
    return directory;
}

export async function cleanup({ directory, identifier }) {
    log.debug(`Task in ${directory} completed successfully.`);
    await syncToBucket({ directory, identifier });

    if (await pathExists(directory)) {
        await remove(directory);
    }
    log.debug(`Task in ${directory} complete.`);
}

export async function cleanupAfterFailure({ directory, identifier }) {
    log.debug(`Task in ${directory} failed. Cleaning up.`);
    await syncToBucket({ directory, identifier });

    if (await pathExists(directory)) {
        await remove(directory);
    }
}

export async function syncToBucket({ directory, identifier }) {
    log.debug(`Sync'ing back to bucket.`);
    let { bucket } = await getS3Handle();
    await bucket.syncLocalPathToBucket({ localPath: path.join(directory, identifier) });
}
