import path from "path";
import { getLogger, loadConfiguration, getStoreHandle, Textract } from "../common";
import { readFile, writeFile, writeJSON, stat, readdir } from "fs-extra";
const log = getLogger();
const {
    TextractClient,
    AnalyzeDocumentCommand,
    DetectDocumentTextCommand,
} = require("@aws-sdk/client-textract");

export async function runTextractOCR({
    task = "text",
    directory,
    identifier,
    resource,
    className = "item",
}) {
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
    let targetOCROutput = path.join(
        directory,
        identifier,
        `${sourceBasename}.textract_ocr-${configuration.api.filenaming.adminTag}.json`
    );
    let targetTei = path.join(directory, identifier, `${sourceBasename}.tei.xml`);

    let fileStat = await stat(source);
    if (fileStat.size > 10 * 1024 * 1024) {
        throw new Error(
            `That image file is too big. OCR only accepts images which are less than 10MB in size.`
        );
    }
    log.debug(`Running Textract OCR on '${source}'`);

    const client = new TextractClient(awsConfiguration);
    let data = await readFile(source);
    let params;

    params = {
        Document: {
            Bytes: data,
        },
    };

    let command;
    if (task === "text") {
        command = new DetectDocumentTextCommand(params);
    } else if (task === "table") {
        params.FeatureTypes = ["TABLES"];
        command = new AnalyzeDocumentCommand(params);
    }

    let document = await client.send(command);
    await writeJSON(targetOCROutput, document);

    let textract = new Textract({ identifier, resource, document });
    if (task === "text") {
        document = textract.parseSimpleDocument();
    } else if (task === "table") {
        document = textract.parseTables();
    }
    if (!(await store.pathExists({ path: targetTei }))) {
        await writeFile(targetTei, document.join("\n"));
    }
}
