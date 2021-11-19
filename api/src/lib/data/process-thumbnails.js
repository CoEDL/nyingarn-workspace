import { lookupItemByIdentifier } from "../item";
import { getFiles, submitTask, log, thumbnailHeight } from "./";
import path from "path";

export async function processThumbnails({ userId, identifier, stages, headers }) {
    let item = await lookupItemByIdentifier({
        userId,
        identifier,
    });
    const { files, bucket, configuration } = await getFiles({ identifier });

    for (let resource in files) {
        // does this resource have a thumbnail?
        const resourceFiles = files[resource];
        const thumbnail = resourceFiles.filter((f) => f.name.match(/thumbnail/));
        if (thumbnail.length) continue;

        // no thumbnail - let's generate one

        //  get images and pick out a source image to use
        let images = resourceFiles.filter((f) => f.type === "image");

        let source;
        if (images.length) {
            source = images.filter((i) => i.name.match(/\.tif{1,2}/i)).pop();
            if (!source) source = images.filter((i) => i.name.match(/\.jpe?g/i)).pop();
        }

        if (!source) {
            log.error(
                `processThumbnailsRouteHandler: Unable to find a suitable source image: ${identifier}-${resource}`
            );
            continue;
        }

        thumbnail = `${source.basename}.thumbnail_h${thumbnailHeight}.jpg`;
        let exists = (await bucket.stat({ path: path.join(identifier, thumbnail) })) ? true : false;
        if (!exists) {
            log.debug(`processThumbnailsRouteHandler submit task`);
            submitTask({
                name: "create-thumbnails",
                item,
                body: {
                    files: [
                        {
                            source: source.name,
                            target: thumbnail,
                            height: thumbnailHeight,
                        },
                    ],
                    stages,
                    headers,
                },
            });
        }
    }
}
