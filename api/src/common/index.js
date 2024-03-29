export const completedResources = ".completed-resources.json";
export const resourceStatusFile = ".item-status.json";
export const specialFiles = [
    "LICENCE.md",
    "LICENCE.txt",
    "LICENCE",
    "ro-crate-metadata.json",
    "nocfl.identifier.json",
    "nocfl.inventory.json",
    "-digivol.csv",
    "-tei.xml",
    "-tei-complete.xml",
    "-tei-complete.*.xml",
    "-rights-holder-permission.pdf",
    "-language-authority-permission.pdf",
    "vd{4}-[01]d-[0-3]dT[0-2]d:[0-5]d:[0-5]d.d+([+-][0-2]d:[0-5]d|Z)",
    completedResources,
    resourceStatusFile,
];
export const imageExtensions = ["jpe?g", "png", "webp", "tif{1,2}"];
export const webFormats = [{ ext: "jpg", match: "jpe?g" }, "webp"];
export const authorisedUsersFile = ".authorised-users.json";

import path from "path";
import { getS3Handle } from "./getS3Handle.js";
import { ensureDir } from "fs-extra";

export async function getUserTempLocation({ userId }) {
    if (!userId) {
        throw new Error(`'userId' must be provided`);
    }
    let tempdir = path.join("/srv", "tmp", userId);
    await ensureDir(tempdir);
    return tempdir;
}

export async function loadFiles({ prefix, continuationToken }) {
    let { bucket } = await getS3Handle();
    let resources = await bucket.listObjects({ prefix, continuationToken });
    if (resources.NextContinuationToken) {
        return [
            ...resources.Contents,
            ...(await loadFiles({ prefix, continuationToken: resources.NextContinuationToken })),
        ];
    } else {
        return resources.Contents;
    }
}

export async function listObjects({ prefix }) {
    let { bucket } = await getS3Handle();
    let files = [];
    let objects = await bucket.listObjects({ prefix });
    if (!objects.Contents) objects.Contents = [];
    files.push(
        ...objects.Contents.filter((file) => file.Key.match(/nocfl.identifier.json/)).map(
            (file) => file.Key
        )
    );
    let continuationToken = objects.NextContinuationToken;
    while (continuationToken) {
        let objects = await bucket.listObjects({
            prefix,
            continuationToken,
        });
        files.push(
            ...objects.Contents.filter((file) => file.Key.match(/nocfl.identifier.json/)).map(
                (file) => file.Key
            )
        );
        console.log(`Found ${files.length} objects in ${prefix}`);
        continuationToken = objects.NextContinuationToken;
    }
    let items = [];
    for (let file of files) {
        items.push(await bucket.readJSON({ target: file }));
    }
    return items;
}
