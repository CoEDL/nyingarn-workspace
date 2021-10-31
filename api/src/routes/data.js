import { ForbiddenError } from "restify-errors";
import { getS3Handle, route, registerTask } from "../common";
import { lookupItemByIdentifier } from "../lib/item";
import path from "path";

const imageExtensions = ["jpg", "jpeg", "png", "tif", "tiff"];

export function setupRoutes({ server }) {
    server.get("/process/:identifier/images", route(processImagesRouteHandler));
}

export async function processImagesRouteHandler(req, res, next) {
    let item = await lookupItemByIdentifier({
        userId: req.session.user.id,
        identifier: req.params.identifier,
    });
    if (!item) {
        return next(new ForbiddenError(`You don't have access to that item`));
    }

    // get item images
    let { bucket } = await getS3Handle();
    let response = await bucket.listObjects({ prefix: req.params.identifier });
    let files = response.Contents.map((c) => c.Key);
    for (let file of files) {
        let extension = path.extname(file).replace(/^\./, "");
        if (imageExtensions.includes(extension) && !file.match(/_thumbnail_/)) {
            let task = await registerTask({
                itemId: item.id,
                status: "in progress",
                text: `Create image thumbnails`,
                data: { files: [file] },
            });
            global.rabbit.publish("nyingarn", {
                type: "CreateImageThumbnail",
                body: { identifier: req.params.identifier, files: [file], taskId: task.id },
            });
        }
    }

    res.send({});
    next();
}
