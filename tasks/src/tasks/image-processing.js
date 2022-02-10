import sharp from "sharp";
import path from "path";
import { getLogger } from "../common";
import { remove } from "fs-extra";
const log = getLogger();
import { thumbnailHeight, webFormats, getResourceImages } from "./";

export async function createImageThumbnail({ directory, identifier, resource }) {
    let images;
    ({ resource, images } = await getResourceImages({ identifier, resource }));

    let source;
    if (images.length) {
        source = images.filter((i) => i.name.match(/\.tif{1,2}/i)).pop();
        if (!source) source = images.filter((i) => i.name.match(/\.jpe?g/i)).pop();
    }

    if (!source) {
        log.error(
            `createImageThumbnail: Unable to find a suitable source image: ${identifier}-${resource}`
        );
        return;
    }
    let thumbnail = `${source.basename}.thumbnail_h${thumbnailHeight}.jpg`;

    source = path.join(directory, identifier, source.name);
    let target = path.join(directory, identifier, thumbnail);

    log.debug(`Creating '${target}' from '${source}'`);
    try {
        await sharp(source).resize({ height: thumbnailHeight }).toFile(target);
    } catch (error) {
        await remove(target);
        throw new Error(error.message);
    }
}

export async function createWebFormats({ directory, identifier, resource }) {
    let images;
    ({ resource, images } = await getResourceImages({ identifier, resource }));

    let source;
    if (images.length) {
        source = images.filter((i) => i.name.match(/\.tif{1,2}/i)).pop();
        if (!source) source = images.filter((i) => i.name.match(/\.jpe?g/i)).pop();
    }
    if (!source) {
        log.error(
            `createWebFormats: Unable to find a suitable source image: ${identifier}-${resource}`
        );
        return;
    }
    for (let format of webFormats) {
        if (source.ext.match(format.match ? format.match : format)) continue;
        let target = `${source.basename}.${format.ext ? format.ext : format}`;

        // let filename = path.basename(source).split(".")[0];
        source = path.join(directory, identifier, source.name);
        target = path.join(directory, identifier, target);
        log.debug(`Creating '${target}' from '${source}'`);
        try {
            await sharp(source).toFile(target);
        } catch (error) {
            await remove(target);
            throw new Error(error.message);
        }
    }
}
