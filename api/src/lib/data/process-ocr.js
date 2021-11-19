import { lookupItemByIdentifier } from "../item";
import { getFiles, submitTask, log } from "./";
import path from "path";

export async function processOcr({ userId, identifier, stages, headers }) {
    let item = await lookupItemByIdentifier({
        userId,
        identifier,
    });
    let { files, bucket, configuration } = await getFiles({ identifier });

    for (let resource in files) {
        const resourceFiles = files[resource];
        let images = resourceFiles
            .filter((f) => f.type === "image")
            .filter((f) => !f.name.match("thumbnail"));

        let source;
        if (images.length) {
            source = images.filter((i) => i.name.match(/\.jpe?g/i)).pop();
        }
        if (!source) {
            log.error(
                `processOcrRouteHandler: Unable to find a suitable source image: ${identifier}-${resource}`
            );
            continue;
        }

        let target = `${source.basename}.tesseract_ocr-${configuration.api.filenaming.adminTag}`;
        let exists = (await bucket.stat({ path: path.join(identifier, `${target}.txt`) }))
            ? true
            : false;
        if (!exists) {
            log.debug(`processOcrRouteHandler submit task`);
            submitTask({
                name: "run-ocr",
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
