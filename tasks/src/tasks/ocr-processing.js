import path from "path";
import { getLogger, loadConfiguration } from "../common";
import { createWorker } from "tesseract.js";
import { writeFile, readFile, writeJSON } from "fs-extra";
const log = getLogger();
import { getResourceImages } from "./";
const { TextractClient, DetectDocumentTextCommand } = require("@aws-sdk/client-textract");

export async function runTesseractOCR({ directory, identifier, resource }) {
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
    let source = images.filter((i) => i.ext.match("jpe?g")).pop();
    let target = path.join(
        directory,
        identifier,
        `${source.basename}.tesseract_ocr-${configuration.api.filenaming.adminTag}`
    );

    source = path.join(directory, identifier, source.name);
    log.debug(`Running Tesseract OCR on '${source}'`);

    try {
        let text = await recognize({ worker, source });
        await writeToFile(identifier, `${target}.txt`, text.data.text);
        await writeToFile(identifier, `${target}.html`, text.data.hocr);
    } catch (error) {}

    async function writeToFile(identifier, file, content) {
        try {
            await writeFile(file, content);
        } catch (error) {
            console.log(`Error writing OCR output for '${identifier}' to: ${file}`);
        }
    }

    async function recognize({ worker, source }) {
        return new Promise(async (resolve, reject) => {
            let timeout = setTimeout(async () => {
                log.debug(`Killing the OCR job - 5 minutes have passed.`);
                await worker.terminate();
                reject();
            }, 300000);
            let text = await worker.recognize(source);
            await worker.terminate();
            clearTimeout(timeout);
            resolve(text);
        });
    }
}

export async function runTextractOCR({ directory, identifier, resource }) {
    let images;
    const configuration = await loadConfiguration();
    ({ resource, images } = await getResourceImages({ identifier, resource }));

    let awsConfiguration = {
        credentials: {
            accessKeyId: configuration.api.services.aws.awsAccessKeyId,
            secretAccessKey: configuration.api.services.aws.awsSecretAccessKey,
        },
        region: configuration.api.services.aws.region,
    };

    let source = images.filter((i) => i.ext.match("jpe?g")).pop();
    let target = path.join(
        directory,
        identifier,
        `${source.basename}.textract_ocr-${configuration.api.filenaming.adminTag}.json`
    );
    source = path.join(directory, identifier, source.name);
    log.debug(`Running Textract OCR on '${source}'`);

    const client = new TextractClient(awsConfiguration);
    let data = await readFile(source);
    const params = {
        Document: {
            Bytes: data,
        },
    };
    const command = new DetectDocumentTextCommand(params);

    data = await client.send(command);
    await writeJSON(target, data);
}
