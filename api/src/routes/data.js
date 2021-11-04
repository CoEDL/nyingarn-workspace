import {
    getS3Handle,
    registerTask,
    requireIdentifierAccess,
    demandAuthenticatedUser,
} from "../common";
import { lookupItemByIdentifier } from "../lib/item";
import { groupBy } from "lodash";
import path from "path";

const imageExtensions = ["jpg", "jpeg", "png", "tif", "tiff"];
const thumbnailHeight = 300;
const webFormats = ["jpg", "avif", "webp"];

function routeProcessing(handler) {
    return [demandAuthenticatedUser, requireIdentifierAccess, handler];
}

export function setupRoutes({ server }) {
    server.post("/process/thumbnails", routeProcessing(processThumbnailsRouteHandler));
    server.post("/process/webformats", routeProcessing(processWebformatsRouteHandler));
    server.post("/process/ocr", routeProcessing(processOcrRouteHandler));
}

async function getItem(req) {
    const identifier = req.body.identifier ? req.body.identifier : oeq.params.identifier;
    return await lookupItemByIdentifier({
        userId: req.session.user.id,
        identifier: identifier,
    });
}

export async function processThumbnailsRouteHandler(req, res, next) {
    const identifier = req.body.identifier;
    const item = await getItem(req);
    let { files, bucket } = await getFiles({ identifier });
    let imageFiles = getImageFiles(files);
    let source;
    for (let sequenceNumber in imageFiles) {
        let images = imageFiles[sequenceNumber];
        if (images.length > 1) {
            source = images.filter((i) => i.match(/\.tif+/i)).pop();
            if (!source) source = images.filter((i) => i.match(/\.jpe?g/i)).pop();
        } else {
            source = images.pop();
        }
        let filename = path.basename(source).split(".")[0];
        let thumbnail = `${filename}-ADMIN_thumbnail_h${thumbnailHeight}.jpg`;
        let exists = (await bucket.stat({ path: path.join(identifier, thumbnail) })) ? true : false;
        if (!exists) {
            submitTask({
                name: "CreateImageThumbnail",
                item,
                body: {
                    files: [
                        {
                            source: path.basename(source),
                            target: thumbnail,
                            height: thumbnailHeight,
                        },
                    ],
                },
            });
        }
    }
    res.send({});
    next();
}

export async function processWebformatsRouteHandler(req, res, next) {
    const identifier = req.body.identifier;
    const item = await getItem(req);
    let { files, bucket } = await getFiles({ identifier });
    let imageFiles = getImageFiles(files);
    let source;
    for (let sequenceNumber in imageFiles) {
        let images = imageFiles[sequenceNumber];
        if (images.length > 1) {
            source = images.filter((i) => i.match(/\.tif+/i)).pop();
            if (!source) source = images.filter((i) => i.match(/\.jpe?g/i)).pop();
        } else {
            source = images.pop();
        }

        for (let format of webFormats) {
            let filename = path.basename(source).split(".")[0];
            let target = `${filename}-ADMIN.${format}`;
            let exists = (await bucket.stat({ path: path.join(identifier, target) }))
                ? true
                : false;
            if (!exists) {
                submitTask({
                    name: "CreateWebFormats",
                    item,
                    body: {
                        files: [{ source: path.basename(source), target }],
                    },
                });
            }
        }
    }
    res.send({});
    next();
}

export async function processOcrRouteHandler(req, res, next) {
    const identifier = req.body.identifier;
    const item = await getItem(req);
    let { files, bucket } = await getFiles({ identifier });
    let imageFiles = getImageFiles(files);
    let source;
    for (let sequenceNumber in imageFiles) {
        let images = imageFiles[sequenceNumber];
        if (images.length > 1) {
            source = images.filter((i) => i.match(/\.jpe?g/i)).pop();
        } else {
            source = images.pop();
        }
        let filename = path.basename(source).split(".")[0];
        let target = `${filename}-ADMIN_tesseract_ocr`;
        let exists = (await bucket.stat({ path: path.join(identifier, `${target}.out`) }))
            ? true
            : false;
        if (!exists) {
            submitTask({
                name: "RunOCR",
                item,
                body: {
                    files: [{ source: path.basename(source), target }],
                },
            });
        }
    }
    res.send({});
    next();
}

async function getFiles({ identifier }) {
    let { bucket } = await getS3Handle();
    let files = (await bucket.listObjects({ prefix: identifier })).Contents.map((c) => c.Key);
    return { files, bucket };
}

function getImageFiles(files) {
    let imageFiles = files
        .filter((file) => {
            let extension = path.extname(file).replace(/^\./, "");
            return imageExtensions.includes(extension);
        })
        .filter((file) => !file.match(/-ADMIN_thumbnail_/));
    imageFiles = groupBy(imageFiles, (file) => {
        return file.split("/").pop().split(".").shift().split("-")[1];
    });
    return imageFiles;
}

async function submitTask({ item, name, body }) {
    let task = await registerTask({
        itemId: item.id,
        status: "in progress",
        text: name,
        data: { files: body.files },
    });
    global.rabbit.publish("nyingarn", {
        type: name,
        body: { ...body, identifier: item.identifier, task: name, taskId: task.id },
    });
}
