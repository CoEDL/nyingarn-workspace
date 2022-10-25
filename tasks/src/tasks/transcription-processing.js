import path from "path";
import SaxonJS from "saxon-js";
import { createReadStream, createWriteStream, writeFile, appendFile, remove } from "fs-extra";
import { parse } from "csv-parse";
import { zipObject } from "lodash";
import { getS3Handle, getLogger, loadConfiguration, expandError } from "../common";
import { removeOverlappingNewContent } from "./";
const log = getLogger();

export async function reconstituteTEIFile({ directory, identifier, resource }) {
    let sourceURI = "file://" + path.join(directory, identifier, resource);
    await SaxonJS.transform(
        {
            stylesheetFileName: "/srv/tasks/src/xslt/reconstitute.xsl.sef.json",
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
            stylesheetFileName: "/srv/tasks/src/xslt/process-tei-to-page-files.xsl.sef.json",
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
    let sourceURI = "file://" + path.join(directory, identifier, resource);
    await __processTeiTranscriptionXMLProcessor({ identifier, sourceURI });
    await removeOverlappingNewContent({ directory, identifier, resource });
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

export async function __processTeiTranscriptionXMLProcessor({
    identifier,
    sourceURI,
    output = undefined,
}) {
    /* identifier = e.g. "Bates23"; sourceURI = "file:///blah/blah/Bates23/Bates23-tei.xml" */
    let configuration = await loadConfiguration();
    try {
        const transformationResults = await SaxonJS.transform(
            {
                stylesheetFileName: "/srv/tasks/src/xslt/process-tei-to-page-files.xsl.sef.json",
                templateParams: {
                    identifier: identifier,
                    "source-uri": sourceURI,
                    "page-identifier-regex": configuration.ui.filename.checkNameStructure,
                },
                baseOutputURI: output ? output : sourceURI, // output into the same folder as the source data file
            },
            "async"
        );
    } catch (error) {
        decodeSaxonJSError(error); // unwrap the JSON-formatted error data in the JS XError object thrown by SaxonJS
        throw await expandError(error); // expand the error using the error-definitions file, and throw the expanded error
    }
}

export async function processDigivolTranscription({ directory, identifier, resource }) {
    let sourceURI = "file://" + path.join(directory, identifier, resource);
    await __processDigivolTranscriptionXMLProcessor({ identifier, sourceURI });
    await removeOverlappingNewContent({ directory, identifier, resource });
}

export async function __processDigivolTranscriptionXMLProcessor({
    identifier,
    sourceURI,
    output = undefined,
}) {
    let configuration = await loadConfiguration();
    try {
        const transformationResults = await SaxonJS.transform(
            {
                stylesheetFileName:
                    "/srv/tasks/src/xslt/process-digivol-csv-to-page-files.xsl.sef.json",
                templateParams: {
                    identifier: identifier,
                    "source-uri": sourceURI,
                    "page-identifier-regex": configuration.ui.filename.checkNameStructure,
                },
                baseOutputURI: output ? output : sourceURI, // output into the same folder as the source data file
            },
            "async"
        );
    } catch (error) {
        decodeSaxonJSError(error); // unwrap the JSON-formatted error data in the JS XError object thrown by SaxonJS
        throw await expandError(error); // expand the error using the error-definitions file, and throw the expanded error
    }
}

/*
Tidy up the XError errors thrown by SaxonJS.

These XError objects are thrown by SaxonJS API functions SaxonJS.transform and SaxonJS.XPath.evaluate in
response to errors thrown in XSLT or XPath code due to syntax or runtime errors, or by XPath code deliberately
using the XPath error() function to raise an application-level ("Nyingarn") error.

The Nyingarn XSLT throws errors whose codes are in the namespace "https://nyingarn.net/ns/errors", and
where the error-object is an XDM map (a dictionary of name/value pairs).

Nyingarn XSLT code uses the three-parameter form of the error function, in which the third parameter is a
sequence of arbitrary XDM data items. SaxonJS's XError JavaScript objects contain a representation of these items
inside an object property called errorObject.

Unfortunately, the errorObject represents those XDM items in SaxonJS's own opaque internal form, rather than
translated into standard primitive JS objects like Objects and Arrays, and this is impractical to convert.
See <https://saxonica.plan.io/issues/5678>

So Nyingarn's XSLT error procedure serializes the error map as a JSON object, and throws an error whose
error-object is a single string containing that JSON.

This function recognises those Nyingarn errors, extracts the string containing the JSON object, deserializes it to
a simple JavaScript object, and stores it back in the XError object.
*/
function decodeSaxonJSError(error) {
    if (error.errorObject && error.code.startsWith("Q{https://nyingarn.net/ns/errors}")) {
        try {
            error.errorObject = JSON.parse(error.errorObject["value"]);
        } catch (failedToDecodeErrorObject) {
            console.log("decodeSaxonJSError failed to decode errorObject", error.errorObject);
        }
    }
}
