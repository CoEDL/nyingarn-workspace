import path from "path";
import { getLogger, loadConfiguration, getStoreHandle } from "../common";
import { readFile, writeJSON, stat, readdir } from "fs-extra";
const log = getLogger();
const {
    TextractClient,
    AnalyzeDocumentCommand,
    DetectDocumentTextCommand,
} = require("@aws-sdk/client-textract");

export async function runTextractOCR({ directory, identifier, resource, className = "item" }) {
    let store = await getStoreHandle({ id: identifier, className });
    let storeResources = (await store.listResources()).map((r) => r.Key);

    // have we already run OCR or do we have a TEI xml from somewhere else
    let resourceBasename = path.basename(resource, path.extname(resource));
    if (storeResources.includes(`${resourceBasename}.textract_ocr-ADMIN.json`)) {
        log.debug(`Not sending ${resource} to OCR since we've already done it.`);
        return;
    }
    if (storeResources.includes(`${resourceBasename}.tei.xml`)) {
        log.debug(`Not sending ${resource} to OCR since we already have a TEI xml file.`);
        return;
    }

    const configuration = await loadConfiguration();
    const awsConfiguration = {
        credentials: {
            accessKeyId: configuration.api.services.aws.awsAccessKeyId,
            secretAccessKey: configuration.api.services.aws.awsSecretAccessKey,
        },
        region: configuration.api.services.aws.region,
    };

    let localFiles = await readdir(path.join(directory, identifier));
    const sourceImage = localFiles
        .filter((f) => f.match(/\.jpe?g/))
        .filter((f) => !f.match(/thumbnail/))
        .pop();
    const sourceBasename = path.basename(sourceImage, path.extname(sourceImage));
    const source = path.join(directory, identifier, sourceImage);
    let target = path.join(
        directory,
        identifier,
        `${sourceBasename}.textract_ocr-${configuration.api.filenaming.adminTag}.json`
    );

    let fileStat = await stat(source);
    if (fileStat.size > 10 * 1024 * 1024) {
        throw new Error(
            `That image file is too big. OCR only accepts images which are less than 10MB in size.`
        );
    }
    log.debug(`Running Textract OCR on '${source}'`);

    const client = new TextractClient(awsConfiguration);
    let data = await readFile(source);
    const params = {
        Document: {
            Bytes: data,
        },
    };
    let command = new DetectDocumentTextCommand(params);

    data = await client.send(command);
    await writeJSON(target, data);
}
