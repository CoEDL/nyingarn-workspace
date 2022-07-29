import sharp from "sharp";
import path from "path";
import { getLogger } from "../common";
import { remove } from "fs-extra";
const log = getLogger();
import { thumbnailHeight } from "./";

export async function createImageThumbnail({ directory, identifier, resource }) {
    let resourceBasename = path.basename(resource, path.extname(resource));
    let thumbnail = `${resourceBasename}.thumbnail_h${thumbnailHeight}.jpg`;
    let source = path.join(directory, identifier, resource);
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
    const resourceBasename = path.basename(resource, path.extname(resource));
    const source = path.join(directory, identifier, resource);
    if (path.extname(resource).match(/tif{1,2}/)) {
        // resource is a tif image - create jpeg and webp webformats
        let target = path.join(directory, identifier, `${resourceBasename}.jpg`);
        await createImage({ source, target });

        target = path.join(directory, identifier, `${resourceBasename}.webp`);
        await createImage({ source, target });
    } else if (path.extname(resource).match(/jpe?g/)) {
        // resource is a jpg - create webp format
        let target = path.join(directory, identifier, `${resourceBasename}.webp`);
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
