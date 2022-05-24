import path from "path";
import SaxonJS from "saxon-js";
import { createReadStream, createWriteStream, writeFile, appendFile, remove } from "fs-extra";
import { parse } from "csv-parse";
import { zipObject } from "lodash";
import { getS3Handle, getLogger, loadConfiguration } from "../common";
import { persistNewContentToBucket } from "./";
const log = getLogger();

export async function reconstituteTEIFile({ directory, identifier, resource }) {
    let sourceURI = "file://" + path.join(directory, identifier, resource);
    await SaxonJS.transform(
        {
            stylesheetFileName: "src/xslt/reconstitute.xsl.sef.json",
            templateParams: {
                "source-uri": sourceURI,
            },
            baseOutputURI: sourceURI, // output into the same folder as the source data file
        },
        "async"
    );
}

export async function processTEIToPageFilesAsStrings({ directory, identifier, resource }) {
    //TODO ask SaxonJS to return the documents in memory, rather than write them directly to disk
    // so that the storage bucket can be checked for pre-existing files, to avoid overwriting them.
    // NB use of this implementation is currently blocked by a bug in SaxonJS: https://saxonica.plan.io/issues/5430
    // and instead the processTEIToPageFiles function (below) is used, which returns the TEI fragments as files on disk.
    let sourceURI = "file://" + path.join(directory, identifier, resource);
    try {
        SaxonJS.transform({
            /* log the URIs of result documents */
            deliverResultDocument: function (resultDocumentURI) {
                return {
                    destination: "serialized",
                    save: function (documentURI, documentContent, encoding) {
                        console.log(documentURI);
                    },
                };
            },
            stylesheetFileName: "src/xslt/process-tei-to-page-files.xsl.sef.json",
            templateParams: {
                "source-uri": sourceURI,
            },
            baseOutputURI: sourceURI, // output into the same folder as the source data file
            destination: "serialized",
        });
    } catch (error) {
        console.log(error);
    }
}

export async function processTeiTranscription({ directory, identifier, resource }) {
    await __processTeiTranscriptionXMLProcessor({ directory, identifier, resource });
    await persistNewContentToBucket({ directory, identifier, resource });
}

export async function processDigivolTranscription({ directory, identifier, resource }) {
    let file = path.join(directory, identifier, resource);

    const records = [];
    const parser = createReadStream(file).pipe(
        parse({
            // CSV options if any
        })
    );
    for await (const record of parser) {
        // Work with each record
        records.push(record);
    }

    let data = [];
    let properties = records.shift();
    for (let record of records) {
        data.push(zipObject(properties, record));
    }

    let { bucket } = await getS3Handle();
    for (let record of data) {
        const re = new RegExp(`^${identifier}-.*`);
        if (record.externalIdentifier && record.externalIdentifier.match(re)) {
            let filename = `${record.externalIdentifier.split(".").shift()}.tei.xml`;
            let teiFile = path.join(identifier, filename);
            let exists = await bucket.pathExists({ path: teiFile });

            if (!exists) {
                filename = path.join(directory, identifier, filename);
                await writeFile(filename, `<pb facs="${record.externalIdentifier}"/>\n`);
                if (!record.occurrenceRemarks) {
                    log.error(
                        `'occurrenceRemarks' column not found for record '${record.externalIdentifier}'- no transcription`
                    );
                } else {
                    await appendFile(filename, record.occurrenceRemarks);
                }
            }
        }
    }
}

export async function __processTeiTranscriptionXMLProcessor({ directory, identifier, resource }) {
    let sourceURI = "file://" + path.join(directory, identifier, resource);
    let configuration = await loadConfiguration();
    const transformationResults = await SaxonJS.transform(
        {
            stylesheetFileName: "src/xslt/process-tei-to-page-files.xsl.sef.json",
            templateParams: {
                identifier: identifier,
                "source-uri": sourceURI,
                "page-identifier-regex": configuration.ui.filename.checkNameStructure,
            },
            baseOutputURI: sourceURI, // output into the same folder as the source data file
        },
        "async"
    );
}

export async function __processDigivolTranscriptionXMLProcessor({ directory, identifier, resource }) {
    // SaxonJS doesn't support the "windows-1252" encoding which is used by DigiVol, so we first create a copy
    // of in the input CSV, re-encoded as UTF-8, process the UTF-8-encoded CSV file with our XSLT, and finally delete
    // the UTF-8 encoded file.
    let windowsEncodedFilename = path.join(directory, identifier, resource);
    let utf8EncodedFilename = path.join(directory, identifier, "utf-8.csv");
    const inputStream = createReadStream(windowsEncodedFilename, "latin1");
    const outputStream = createWriteStream(utf8EncodedFilename, "utf-8");
    inputStream.pipe(outputStream);

    let sourceURI = "file://" + utf8EncodedFilename;
    let configuration = await loadConfiguration();
    const transformationResults = await SaxonJS.transform(
        {
            stylesheetFileName: "src/xslt/process-digivol-csv-to-page-files.xsl.sef.json",
            templateParams: {
                identifier: identifier,
                "source-uri": sourceURI,
                "page-identifier-regex": configuration.ui.filename.checkNameStructure,
            },
            baseOutputURI: sourceURI, // output into the same folder as the source data file
        },
        "async"
    );
    // discard the temporarily re-encoded CSV file
    remove(utf8EncodedFilename);
}