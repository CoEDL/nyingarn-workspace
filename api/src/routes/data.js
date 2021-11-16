import {
    loadConfiguration,
    getS3Handle,
    getLogger,
    registerTask,
    requireIdentifierAccess,
    demandAuthenticatedUser,
} from "../common";
import { lookupItemByIdentifier } from "../lib/item";
import { groupBy } from "lodash";
import path from "path";
const log = getLogger();

const imageExtensions = ["jpe?g", "png", "tif{1,2}"];
const thumbnailHeight = 300;
const webFormats = [{ ext: "jpg", match: "jpe?g" }, "avif", "webp"];

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
                name: "CreateImageThumbnail",
                item,
                body: {
                    files: [
                        {
                            source: source.name,
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
                    name: "CreateWebFormats",
                    item,
                    body: {
                        files: [{ source: source.name, target }],
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
                name: "RunOCR",
                item,
                body: {
                    files: [{ source: source.name, target }],
                },
            });
        }
    }
    res.send({});
    next();
}

async function getFiles({ identifier }) {
    let configuration = await loadConfiguration();

    let { bucket } = await getS3Handle();
    let files = (await bucket.listObjects({ prefix: identifier })).Contents.map((c) => c.Key);

    ({ files } = groupFilesByResource({ files, naming: configuration.api.filenaming }));
    return { files, bucket, configuration };
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
