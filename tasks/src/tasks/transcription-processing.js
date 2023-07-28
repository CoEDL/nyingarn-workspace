import fsPackage from "fs-extra";
const { createReadStream, writeFile, remove } = fsPackage;
import path from "path";
import SaxonJS from "saxon-js";
import { parse } from "csv-parse";
import lodashPackage from "lodash";
const { zipObject } = lodashPackage;
import { log, loadConfiguration } from "/srv/api/src/common/index.js";
import { expandError } from "../common/errors.js";
import FormData from 'form-data';
import fetch, {
  Blob,
  blobFrom,
  blobFromSync,
  File,
  fileFrom,
  fileFromSync,
} from 'node-fetch';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';

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

export async function __processTeiTranscriptionXMLProcessor({
    directory,
    identifier,
    resource,
}) {
    let configuration = await loadConfiguration();
    const teiFile = path.join(directory, resource);
    // prepare the HTTP form post
    const form = new FormData();
    form.append("identifier", identifier);
    form.append("page-identifier-regex", configuration.ui.filename.checkNameStructure);
    const stream = createReadStream(teiFile);
    form.append('source', stream, teiFile);
    try {
    	// post the form data and retrieve a response containing a <directory> XML document, containing a list of <file> elements
    	const response = await fetch('http://xml:8080/nyingarn/ingest-tei', {method: 'POST', body: form});
    	if (response.ok) {
    		// xml web service returned XML successfully
    		const text = await response.text();
    		// write the content of each <file> element as a separate file
    		writeDirectory(text, directory);
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
    form.append('source', stream, jsonFile);
    try {
    	// post the form data and retrieve a response containing a <directory> XML document, containing a list of <file> elements
    	const response = await fetch('http://xml:8080/nyingarn/ingest-json', {method: 'POST', body: form});
    	if (response.ok) {
    		// xml web service returned XML successfully
    		const text = await response.text();
    		// write the content of each <file> element as a separate file
    		writeDirectory(text, directory);
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
	return Array.from(element.childNodes).filter(node => node.nodeType === 1); // nodeType 1 is an element
}

function writeDirectory(directoryXML, directory) {
	// parse a "directory" XML file and save its "file" child elements as separate files, into the specified output directory
	const directoryDocument = new DOMParser().parseFromString(directoryXML, 'application/xml');
	const serializer = new XMLSerializer();
	const directoryElement = directoryDocument.documentElement;
	// NB xmldom's 'children' and 'firstElementChild' properties don't work
	const childNodes = childElements(directoryElement);
	childNodes.forEach(
		function(childNode) {
			// childNode is a c:file element
			var fileName = childNode.getAttribute("name");
			// NB xmldom's 'children' and 'firstElementChild' properties don't work
			var surfaceElement = childElements(childNode)[0];
			writeFile(
			  path.join(directory, fileName), 
			  serializer.serializeToString(surfaceElement)
			 );
		}
	);	
}

// TODO check if this function is now orphaned, and if so, delete it
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
            console.error("decodeSaxonJSError failed to decode errorObject", error.errorObject);
        }
    }
}
