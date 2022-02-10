export { createImageThumbnail, createWebFormats } from "./image-processing";
export { runTesseractOCR, runTextractOCR } from "./ocr-processing";
export {
    processDigivolTranscription,
    processFtpTeiTranscription,
} from "./transcription-processing";

import { groupBy } from "lodash";
import path from "path";
import { getS3Handle, loadConfiguration } from "../common";

export const imageExtensions = ["jpe?g", "png", "webp", "tif{1,2}"];
export const thumbnailHeight = 300;
export const webFormats = [{ ext: "jpg", match: "jpe?g" }, "webp"];

export async function getFiles({ identifier }) {
    let configuration = await loadConfiguration();

    let { bucket } = await getS3Handle();
    let files = (await bucket.listObjects({ prefix: identifier })).Contents.map((c) => c.Key);

    ({ files } = groupFilesByResource({ files, naming: configuration.api.filenaming }));
    return { files, bucket, configuration };
}

export function groupFilesByResource({ files, naming }) {
    let exclusions = ["ro-crate-metadata.json"];
    let resources = [];
    for (let file of files) {
        let [filepath, filename] = file.split("/");
        if (exclusions.includes(filename)) continue;

        let ext = path.extname(filename).replace(".", "");
        let basename = path.basename(filename, `.${ext}`);
        let identifierSegments = basename
            .split(`-${naming.adminTag}`)[0]
            .split(naming.resourceQualifierSeparator)[0]
            .split("-");

        let adminLabel = path.basename(filename, ext).split(naming.adminTag)[1];

        let type;
        imageExtensions.forEach((t) => {
            let re = new RegExp(t);
            type = ext.match(re) ? "image" : type;
        });

        let data = naming.identifierSegments[identifierSegments.length]
            .map((segmentName, i) => ({
                [segmentName]: identifierSegments[i],
            }))
            .reduce((acc, cv) => ({ ...acc, ...cv }));

        resources.push({
            file,
            basename,
            name: filename,
            path: filepath,
            ext,
            adminLabel,
            type,
            ...data,
        });
    }

    return { files: groupBy(resources, "resourceId") };
}

export async function getResourceImages({ identifier, resource }) {
    let { files } = await getFiles({ identifier });

    for (let resourceId of Object.keys(files)) {
        let re = new RegExp(resourceId);
        if (resource.match(re)) {
            resource = files[resourceId];
            break;
        }
    }

    let images = resource
        .filter((f) => f.type === "image")
        .filter((f) => !f.name.match(/thumbnail/));
    return { resource, images };
}
