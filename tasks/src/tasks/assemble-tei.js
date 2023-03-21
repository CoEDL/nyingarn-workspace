import { getStoreHandle, getLogger, loadConfiguration } from "/srv/api/src/common/index.js";
import fsExtraPkg from "fs-extra";
const { ensureDir, copy, remove, writeFile, writeJSON, readdir } = fsExtraPkg;
import SaxonJS from "saxon-js";

const log = getLogger();

/* assemble a full TEI XML file from various fragments */
export async function assembleTeiDocument({ task, identifier, directory }) {
    // Assemble the final TEI document from the set of <surface> fragment files (named something like {identifier}-001.tei.xml, {identifier}-002.tei.xml, etc),
    // and the RO-Crate metadata file named ro-crate-metadata.json, producing an output file named {identifier}-tei-complete.xml

    // Read the app configuration to retrieve the regular expression used to validate XML filenames
    let configuration = await loadConfiguration();

    // In SaxonJS the standard XPath function uri-collection() is unimplemented, so instead we construct a space-delimited list
    // of the input filenames here in JS, and pass that to the XSLT as a parameter
    const files = (await readdir(directory)).join(" ");

    await SaxonJS.transform(
        {
            stylesheetFileName: "/srv/tasks/src/xslt/reconstitute.xsl.sef.json",
            templateParams: {
                files: files,
                identifier: identifier,
                "page-identifier-regex": configuration.ui.filename.checkNameStructure,
                "base-uri": `file://${directory}/`,
            },
            baseOutputURI: `file://${directory}/`,
        },
        "async"
    );
}
