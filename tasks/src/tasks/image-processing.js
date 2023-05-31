import sharp from "sharp";
import path from "path";
import { log } from "/srv/api/src/common/index.js";
import { remove } from "fs-extra";
import { thumbnailHeight } from "./index.js";

export async function createImageThumbnail({ directory, resource }) {
    let resourceBasename = path.basename(resource, path.extname(resource));
    let thumbnail = `${resourceBasename}.thumbnail_h${thumbnailHeight}.jpg`;
    let source = path.join(directory, resource);
    let target = path.join(directory, thumbnail);
    log.debug(`Creating '${target}' from '${source}'`);
    try {
        await sharp(source).resize({ height: thumbnailHeight }).toFile(target);
    } catch (error) {
        await remove(target);
        throw new Error(error.message);
    }
}

export async function createWebFormats({ directory, resource }) {
    const resourceBasename = path.basename(resource, path.extname(resource));
    const source = path.join(directory, resource);
    if (path.extname(resource).match(/tif{1,2}/i)) {
        // resource is a tif image - create jpeg and webp webformats
        let target = path.join(directory, `${resourceBasename}.jpg`);
        await createImage({ source, target });

        target = path.join(directory, `${resourceBasename}.webp`);
        await createImage({ source, target });
    } else if (path.extname(resource).match(/jpe?g/i)) {
        // resource is a jpg - create webp format
        let target = path.join(directory, `${resourceBasename}.webp`);
        await createImage({ source, target });
    }

    async function createImage({ source, target }) {
        log.debug(`Creating '${target}' from '${source}'`);
        try {
            await sharp(source).toFile(target);
        } catch (error) {
            await remove(target);
            throw new Error(error.message);
        }
    }
}
