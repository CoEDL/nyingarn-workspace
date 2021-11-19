import { loadConfiguration, getS3Handle, getLogger, registerTask } from "../../common";
export const log = getLogger();
import { groupBy } from "lodash";
import path from "path";

export const imageExtensions = ["jpe?g", "png", "tif{1,2}"];
export const thumbnailHeight = 300;
export const webFormats = [{ ext: "jpg", match: "jpe?g" }, "avif", "webp"];

export { processThumbnails } from "./process-thumbnails";
export { processOcr } from "./process-ocr";
export { processWebFormats } from "./process-web-formats";

export async function getFiles({ identifier }) {
    let configuration = await loadConfiguration();

    let { bucket } = await getS3Handle();
    let files = (await bucket.listObjects({ prefix: identifier })).Contents.map((c) => c.Key);

    ({ files } = groupFilesByResource({ files, naming: configuration.api.filenaming }));
    return { files, bucket, configuration };
}

export async function submitTask({ item, name, body }) {
    let configuration = await loadConfiguration();
    let task = await registerTask({
        itemId: item.id,
        status: "in progress",
        text: name,
        data: { files: body.files },
    });
    global.rabbit.publish(configuration.api.processing.exchange, {
        type: name,
        body: { ...body, identifier: item.identifier, task: name, taskId: task.id },
    });
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
