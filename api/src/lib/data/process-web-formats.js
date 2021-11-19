import { lookupItemByIdentifier } from "../item";
import { getFiles, submitTask, log, webFormats } from "./";
import path from "path";

export async function processWebFormats({ userId, identifier, stages, headers }) {
    let item = await lookupItemByIdentifier({
        userId,
        identifier,
    });
    let { files, bucket, configuration } = await getFiles({ identifier });

    for (let resource in files) {
        const resourceFiles = files[resource];
        const images = resourceFiles
            .filter((f) => f.type === "image")
            .filter((f) => !f.name.match("thumbnail"));

        let source;
        if (images.length) {
            source = images.filter((i) => i.name.match(/\.tif{1,2}/i)).pop();
            if (!source) source = images.filter((i) => i.name.match(/\.jpe?g/i)).pop();
        }
        if (!source) {
            log.error(
                `processWebFormatsRouteHandler: Unable to find a suitable source image: ${identifier}-${resource}`
            );
            continue;
        }

        for (let format of webFormats) {
            if (source.ext.match(format.match ? format.match : format)) continue;

            // let filename = path.basename(source).split(".")[0];
            let target = `${source.basename}.${format.ext ? format.ext : format}`;
            let exists = (await bucket.stat({ path: path.join(identifier, target) }))
                ? true
                : false;
            if (!exists) {
                log.debug(`createWebFormatsRouteHandler submit task`);
                submitTask({
                    name: "create-web-formats",
                    item,
                    body: {
                        files: [{ source: source.name, target }],
                        stages,
                        headers,
                    },
                });
            }
        }
    }
}
