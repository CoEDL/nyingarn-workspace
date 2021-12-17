import sharp from "sharp";
import path from "path";
import { getLogger, loadConfiguration } from "../common";
import { createWorker } from "tesseract.js";
import { writeFile } from "fs-extra";
const log = getLogger();
import { getFiles, thumbnailHeight, webFormats } from "./";

async function getResourceImages({ identifier, resource }) {
    let { files } = await getFiles({ identifier });

    for (let resourceId of Object.keys(files)) {
        let re = new RegExp(resourceId);
        if (resource.match(re)) {
            resource = files[resourceId];
            break;
        }
    }

    let images = resource
        .filter((f) => f.type === "image")
        .filter((f) => !f.name.match(/thumbnail/));
    return { resource, images };
}

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
    await sharp(source).resize({ height: thumbnailHeight }).toFile(target);
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
        await sharp(source).toFile(target);
    }
}

export async function runOCR({ directory, identifier, resource }) {
    let images;
    const configuration = await loadConfiguration();
    ({ resource, images } = await getResourceImages({ identifier, resource }));

    let masterTei = resource.filter((f) => f.name.match(/tei\.xml/));
    if (masterTei.length) return;

    const worker = createWorker({
        // logger: (m) => console.log(m),
    });
    await worker.load();
    await worker.loadLanguage("eng");
    await worker.initialize("eng");
    let source = images.filter((i) => i.ext === "jpg").pop();
    let target = path.join(
        directory,
        identifier,
        `${source.basename}.tesseract_ocr-${configuration.api.filenaming.adminTag}`
    );

    source = path.join(directory, identifier, source.name);
    log.debug(`Running OCR on '${source}'`);
    let text = await worker.recognize(source);
    await writeToFile(identifier, `${target}.txt`, text.data.text);
    await writeToFile(identifier, `${target}.html`, text.data.hocr);
    await worker.terminate();

    async function writeToFile(identifier, file, content) {
        try {
            await writeFile(file, content);
        } catch (error) {
            console.log(`Error writing OCR output for '${identifier}' to: ${file}`);
        }
    }
}
