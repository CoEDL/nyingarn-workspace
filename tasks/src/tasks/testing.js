// common utility functions used in testing

import path from "path";
import { createReadStream, writeFile, readdir, remove, ensureDir, pathExists, copy } from "fs-extra";
import { log, loadConfiguration } from "/srv/api/src/common/index.js";
import FormData from "form-data";
import fetch from "node-fetch";
import { DOMParser, XMLSerializer } from "@xmldom/xmldom";
import { expandError } from "../common/errors.js";

// copy a folder of test data to a temporary location outside the codebase, which can be
// cleaned up at the end of a test simply by deleting the entire folder
export async function makeScratchCopy(testDataFolder, testCode = "test") {
    // The testDataFolder parameter specifies a folder path relative to the "test-data" folder.
    // This function makes a temporary copy of that specific folder outside of the source
    // code tree and returns the full path of that temporary folder.
    const sourceFolder = path.join(__dirname, "../test-data/", testDataFolder);
    // the optional testCode parameter is used to disambiguate tests which work with the same source data
    // since the tests may run simultaneously, creating and deleting files in the scratch directory, and
    // negating the independence of the tests
    const scratchFolder = path.join("/tmp/test-data/", testDataFolder.replaceAll("/", "_") + '-' + testCode);
    await ensureDir(scratchFolder);
    await copy(sourceFolder, scratchFolder);
    return scratchFolder;
}

export async function validateWithSchematron({instance, schema}) {
    // The instance parameter contains the name of a single file to validate,
    // or multiple file names in an array.
    // The schema parameter is the filename of a schematron schema.
    // If there's a single instance document, it's validated "as is", but if there are
    // more than one, they are passed to the validator as a single document in which
    // each has been wrapped in a c:file element, and the c:file elements wrapped in
    // a c:directory element.
    // This function validates the named instance document(s) against the named schema.
    // If the validation succeeds, the XML web service returns a schematron report
    // with HTTP response code 200, and this function returns that as a DOM Document.
    // If the validation fails, the XML web service returns an HTTP 400 code with a 
    // JSON representation of an object which this function then throws as an error.
    const form = new FormData();
    const schemaStream = createReadStream(schema);
    form.append("schema", schemaStream, schema);
    // upload the instance or instances (if the parameter is an array)
    if (Array.isArray(instance)) {
        instance.forEach(
            function(singleInstance) {
                const instanceStream = createReadStream(singleInstance);
                form.append("instance", instanceStream, singleInstance);
            }
        );
    } else {
        // single instance to upload
        const instanceStream = createReadStream(instance);
        form.append("instance", instanceStream, instance);
    }
    try {
        let configuration = await loadConfiguration();	
        // post the form data and retrieve a response containing a successful SVRL report or an error
        const response = await fetch(
            `${configuration.api.services.xml.host}/nyingarn/validate-with-schematron`,
            { method: "POST", body: form }
        );
        if (response.ok) {
            // Validation succeeded; xml web service returns a report in Schematron Validation Report Language
            const svrl = await response.text();
            // return a DOM Document containing the SVRL report
            return new DOMParser().parseFromString(svrl, "application/xml");
        } else {
            // Validation failed; xml web service returns the failed assertions in the form of a throwable JSON object 
            const error = await response.json();
            throw error;
        }
    } catch (error) {
        throw await expandError(error); // expand the error using the error-definitions file, and throw the expanded error
    }
}