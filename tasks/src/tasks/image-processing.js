import sharp from "sharp";
import path from "path";
import { getLogger } from "../common";
import { createWorker } from "tesseract.js";
import { writeFile } from "fs-extra";
const log = getLogger();

export async function createImageThumbnail({ directory, identifier, files }) {
    for (let file of files) {
        let source = path.join(directory, identifier, file.source);
        let target = path.join(directory, identifier, file.target);
        await sharp(source).resize({ height: file.height }).toFile(target);
    }
}

export async function createWebFormats({ directory, identifier, files }) {
    for (let file of files) {
        let source = path.join(directory, identifier, file.source);
        let target = path.join(directory, identifier, file.target);
        await sharp(source).toFile(target);
    }
}

export async function runOCR({ directory, identifier, files }) {
    const worker = createWorker({
        // logger: (m) => console.log(m),
    });

    await worker.load();
    await worker.loadLanguage("eng");
    await worker.initialize("eng");
    for (let file of files) {
        let source = path.join(directory, identifier, file.source);
        let target = path.join(directory, identifier, file.target);
        let text = await worker.recognize(source);
        await writeFile(`${target}.out`, JSON.stringify(text));
        await writeFile(`${target}.txt`, text.data.text);
        await writeFile(`${target}.hocr`, text.data.hocr);
    }
    await worker.terminate();
}
