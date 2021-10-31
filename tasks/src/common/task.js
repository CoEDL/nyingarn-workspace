import { getS3Handle } from "./";
import { getLogger } from "./logger";
import { ensureDir, remove, pathExists } from "fs-extra";
import crypto from "crypto";
import path from "path";
const log = getLogger();

export async function prepare({ files }) {
    let { bucket } = await getS3Handle();
    let id = crypto.randomBytes(20).toString("hex");
    let directory = await ensureDir(path.join("/tmp", id));
    log.debug(`Setting up task to run in directory: ${directory}.`);

    for (let file of files) {
        await bucket.downloadFileToFolder({
            file: file.source,
            localPath: directory,
        });
    }
    return directory;
}

export async function cleanup({ directory, identifier }) {
    log.debug(`Task in ${directory} completed successfully. Sync'ing back to bucket.`);
    let { bucket } = await getS3Handle();
    await bucket.syncLocalPathToBucket({ localPath: path.join(directory, identifier) });

    if (await pathExists(directory)) {
        await remove(directory);
    }
}

export async function cleanupAfterFailure({ directory, identifier }) {
    log.debug(`Task in ${directory} failed. Cleaning up.`);
    let { bucket } = await getS3Handle();
    await bucket.syncLocalPathToBucket({ localPath: path.join(directory, identifier) });

    if (await pathExists(directory)) {
        await remove(directory);
    }
}
