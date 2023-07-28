import { getLogger, loadConfiguration } from "/srv/api/src/common/index.js";
import fsExtraPkg from "fs-extra";
const { readdir } = fsExtraPkg;
import path from "path";
import fsPackage from "fs-extra";
const { createReadStream, writeFile, remove } = fsPackage;
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

const log = getLogger();

/* assemble a full TEI XML file from various fragments */
export async function assembleTeiDocument({ task, identifier, directory }) {
    // Assemble the final TEI document from the set of <surface> fragment files (named something like {identifier}-001.tei.xml, {identifier}-002.tei.xml, etc),
    // and the RO-Crate metadata file named ro-crate-metadata.json, producing an output file named {identifier}-tei-complete.xml

    // Read the app configuration to retrieve the regular expression used to validate XML filenames
    let configuration = await loadConfiguration();

    // prepare the HTTP form post
    const form = new FormData();
    form.append("identifier", identifier);
    form.append("page-identifier-regex", configuration.ui.filename.checkNameStructure);
    // upload the ro-crate file
    const roCrateStream = createReadStream(path.join(directory, 'ro-crate-metadata.json'));
    form.append('ro-crate', roCrateStream, 'ro-crate-metadata.json');
    // enumerate the surface files
    const files = (await readdir(directory)).sort();
    files
        .filter(file => file.endsWith('.tei.xml'))
        .forEach(
            function(file) {
                const stream = createReadStream(path.join(directory, file));
                form.append('source', stream, file);
    	    }
       );
    try {
    	// post the form data and retrieve a response containing a <directory> XML document, containing a list of <file> elements
    	const response = await fetch('http://xml:8080/nyingarn/reconstitute-tei', {method: 'POST', body: form});
    	if (response.ok) {
    		// xml web service returned XML successfully
    		const text = await response.text();
    		// write the content of each <file> element as a separate file
    		await writeFile(path.join(directory, identifier + '-tei-complete.xml'), text);
    	} else {
    		// xml web service returned an error; entity will be a JSON representation of the error 
    		const json = await response.json();
    		throw json;
    	}
    } catch (error) {
        throw await expandError(error); // expand the error using the error-definitions file, and throw the expanded error
    }
}
