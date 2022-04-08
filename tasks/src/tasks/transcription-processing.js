import path from "path";
import SaxonJS from "saxon-js";
import { readFile, remove, createReadStream, writeFile, appendFile, readdir } from "fs-extra";
import { parse } from "csv-parse";
import { zipObject, isEmpty } from "lodash";
import { getS3Handle, getLogger } from "../common";
import { loadResources } from "./";
let { DOMParser, XMLSerializer } = require("xmldom");
import xmlserializer from "xmlserializer";
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
    //TODO ask SaxonJS to return the documents in memory, rather than write them directly to disk
    // so that the storage bucket can be checked for pre-existing files, to avoid overwriting them.

    let sourceURI = "file://" + path.join(directory, identifier, resource);
    const transformationResults = await SaxonJS.transform(
        {
            stylesheetFileName: "src/xslt/process-tei-to-page-files.xsl.sef.json",
            templateParams: {
                "source-uri": sourceURI,
            },
            baseOutputURI: sourceURI, // output into the same folder as the source data file
        },
        "async"
    );

    let { bucket } = await getS3Handle();
    let files = await loadResources({ bucket, prefix: identifier });
    files = files.map((f) => path.basename(f.Key));

    let localFiles = await readdir(path.join(directory, identifier));
    for (let file of localFiles) {
        if (files.includes(file) && file !== resource) {
            await remove(path.join(directory, identifier, file));
        }
    }
    // for (const documentURI in transformationResults.resultDocuments) {
    //     console.log(documentURI);
    // }
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

/*
export async function processFtpTeiTranscription({ directory, identifier, resource }) {
    let doc = await loadTeiDocument({ directory, identifier, resource });
    let nodes = getElementsByName(doc, "pb");
    let pbIds = nodes.map((n) => n.getAttribute("xml:id"));
    let divs = getElementsByName(doc, "div");

    let { bucket } = await getS3Handle();
    for (let pbId of pbIds) {
        const id = pbId.replace("F", "OTP");
        let node = divs.filter((n) => n.getAttribute("xml:id") === id)[0];

        let paragraphs = getElementsByName(node, "p");

        let pageIdentifier = getElementsByName(node, "fw")[0].childNodes[0].nodeValue;

        let filename = `${pageIdentifier}.tei.xml`;
        let teiFile = path.join(identifier, filename);
        let exists = await bucket.pathExists({ path: teiFile });

        if (!exists) {
            filename = path.join(directory, identifier, filename);
            await writeFile(filename, `<pb facs="${pageIdentifier}.jpg"/>\n`);
            for (let p of paragraphs) {
                p.removeAttribute("xml:id");
                await appendFile(
                    filename,
                    xmlserializer
                        .serializeToString(p)
                        .replace(' xmlns="http://www.tei-c.org/ns/1.0"', "")
                );
            }
        }
    }
}
*/

export async function loadTeiDocument({ directory, identifier, resource }) {
    const dom = new DOMParser({
        locator: {},
        errorHandler: {
            warning: () => {},
            error: (e) => console.log("ERROR:", file, e.replace("\n", " - ")),
            fatalError: (e) => console.log(file, e),
        },
    });
    const file = path.join(directory, identifier, resource);
    let data = await readFile(file);
    const doc = dom.parseFromString(data.toString());
    return doc;
}

function getElementsByName(node, element) {
    let nodes = node.getElementsByTagName(element);
    let keys = Object.keys(nodes).filter((k) => k.match(/^\d+$/));
    return keys.map((k) => nodes[k]);
}
