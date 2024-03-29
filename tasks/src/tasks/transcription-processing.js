import fsPackage from "fs-extra";
const { createReadStream, writeFile, remove } = fsPackage;
import path from "path";
import { parse } from "csv-parse";
import lodashPackage from "lodash";
const { zipObject } = lodashPackage;
import { loadConfiguration } from "/srv/api/src/common/configuration.js";
import { expandError } from "../common/errors.js";
import FormData from "form-data";
import fetch from "cross-fetch";
import { DOMParser, XMLSerializer } from "@xmldom/xmldom";

export async function processTeiTranscription({ directory, identifier, resource }) {
    await __processTeiTranscriptionXMLProcessor({ directory, identifier, resource });
}

/*
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
*/

export async function __processTeiTranscriptionXMLProcessor({ directory, identifier, resource }) {
    let configuration = await loadConfiguration();
    const teiFile = path.join(directory, resource);
    // prepare the HTTP form post
    const form = new FormData();
    form.append("identifier", identifier);
    form.append("page-identifier-regex", configuration.ui.filename.checkNameStructure);
    const stream = createReadStream(teiFile);
    form.append("source", stream, teiFile);
    try {
        // post the form data and retrieve a response containing a <directory> XML document, containing a list of <file> elements
        const response = await fetch(`${configuration.api.services.xml.host}/nyingarn/ingest-tei`, {
            method: "POST",
            body: form,
        });
        if (response.ok) {
            // xml web service returned XML successfully
            const text = await response.text();
            // write the content of each <file> element as a separate file
            await writeDirectory(text, directory);
        } else {
            // xml web service returned an error; entity will be a JSON representation of the error
            const json = await response.json();
            throw json;
        }
    } catch (error) {
        throw await expandError(error); // expand the error using the error-definitions file, and throw the expanded error
    }
}

export async function processDigivolTranscription({ directory, identifier, resource }) {
    await __processDigivolTranscriptionXMLProcessor({ directory, identifier, resource });
}

export async function __processDigivolTranscriptionXMLProcessor({
    directory,
    identifier,
    resource,
}) {
    // Parses a DigiVol CSV file into an equivalent JSON data structure, saves it to a file, and
    // passes the URI of the file to an XSLT to perform the remainder of the ingestion work.

    // Parse the CSV file into an array of objects representing lines of the file, where
    // each object has keys which are the column headers and values which are cell contents
    let csvFile = path.join(directory, resource);
    let data = [];
    const records = [];
    // NB createReadStream will happily read a file containing non UTF-8 byte sequences,
    // even if you explicitly pass encoding 'utf-8' as the encoding. So the encoding error
    // will be propagated to the JSON file and caught by the XSLT when parsing the JSON.
    const parser = createReadStream(csvFile).pipe(
        parse({
            // CSV options if any
        })
    );
    for await (const record of parser) {
        // Work with each record
        records.push(record);
    }
    let properties = records.shift();
    for (let record of records) {
        data.push(zipObject(properties, record));
    }
    // serialize the data as a JSON file
    let jsonFile = csvFile + ".json";
    await writeFile(jsonFile, JSON.stringify(data));

    let configuration = await loadConfiguration();

    // prepare the HTTP form post
    const form = new FormData();
    form.append("identifier", identifier);
    form.append("page-identifier-regex", configuration.ui.filename.checkNameStructure);
    const stream = createReadStream(jsonFile);
    form.append("source", stream, jsonFile);

    try {
        // post the form data and retrieve a response containing a <directory> XML document, containing a list of <file> elements
        const response = await fetch(
            `${configuration.api.services.xml.host}/nyingarn/ingest-json`,
            { method: "POST", body: form }
        );
        if (response.ok) {
            // xml web service returned XML successfully
            const text = await response.text();
            // write the content of each <file> element as a separate file
            await writeDirectory(text, directory);
        } else {
            // xml web service returned an error; entity will be a JSON representation of the error
            const json = await response.json();
            throw json;
        }
    } catch (error) {
        throw await expandError(error); // expand the error using the error-definitions file, and throw the expanded error
    } finally {
        // remove the temporary JSON file
        await remove(jsonFile);
    }
}

// Helper function to return the list of a child elements of a given element
// NB this replaces xmldom's 'children' function which is defective.
function childElements(element) {
    return Array.from(element.childNodes).filter((node) => node.nodeType === 1); // nodeType 1 is an element
}

async function writeDirectory(directoryXML, directory) {
    // parse a "directory" XML file and save its "file" child elements as separate files, into the specified output directory
    const directoryDocument = new DOMParser().parseFromString(directoryXML, "application/xml");
    const serializer = new XMLSerializer();
    const directoryElement = directoryDocument.documentElement;
    // NB xmldom's 'children' and 'firstElementChild' properties don't work
    const childNodes = childElements(directoryElement);
    for (let childNode of childNodes) {
        // childNode is a c:file element
        var fileName = childNode.getAttribute("name");
        // NB xmldom's 'children' and 'firstElementChild' properties don't work
        var surfaceElement = childElements(childNode)[0];
        await writeFile(
            path.join(directory, fileName),
            serializer.serializeToString(surfaceElement)
        );
    }
}
