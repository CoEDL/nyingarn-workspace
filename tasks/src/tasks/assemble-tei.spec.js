import { assembleTeiDocument } from "./assemble-tei.js";
import {
    __processTeiTranscriptionXMLProcessor,
} from "./transcription-processing";
import {
    validateWithSchematron,
    makeScratchCopy
} from "./testing";
import path from "path";
import { ensureDir, copy, remove, writeFile, writeJSON, readdir } from "fs-extra";

describe(`Test assembling a TEI file from the stub files`, () => {
    it(`Should be able to assemble a simple TEI file from the stub files`, async () => {
        const identifier = "test"; 
        const directory = "/tmp/test";
        await ensureDir(directory);
        // let store = await getStoreHandle({ id: identifier, className: "item" });
        // await store.createItem();
        for (let i of ["01", "02", "03"]) {
            // await store.put({
            //     target: `${identifier}-${i}.tei.xml`,
            //     content: sampleDocument(identifier, i),
            // });
            await writeFile(
                path.join(directory, `${identifier}-${i}.tei.xml`),
                sampleDocument(identifier, i)
            );
        }
        await writeJSON(path.join(directory, "ro-crate-metadata.json"), roCrateFile());
        await assembleTeiDocument({ identifier, directory });
        //await remove(directory);
        // await store.deleteItem({ prefix: store.getItemPath() });
    });

    it(`Should be able to assemble a complex TEI file from the stub files`, async () => {
        // copy test data to a scratch folder
        const directory = await makeScratchCopy("reconstitute-tei/structured");
        // assemble the source files into a new TEI file
        const identifier = "structured";
        await assembleTeiDocument({ identifier, directory });
        await remove(directory);
    });

    it(`Should be able to perform a lossless round trip; splitting a file, reconstituting the parts, re-splitting, and re-reconstituting`, async () => {
        // In order to test a full round trip, the input TEI document is first split, 
        // then reassembled, and then split and reassembled a second time.
        let identifier = "structured";
        let resource = "structured-tei.xml";
        let directory = await makeScratchCopy("tei-div-hierarchy-splitting/structured");
        // make a snapshot of the original file, because round-tripping will overwrite it,
        // and we need to have a snapshot to compare it to the final result
        let sourceFile = path.join(directory, resource);
        let sourceSnapshot = path.join(directory, "original-tei.xml");
        await copy(sourceFile, sourceSnapshot);
        // split and reassemble the source file 
        await __processTeiTranscriptionXMLProcessor({
            directory,
            identifier,
            resource,
        });
        await assembleTeiDocument({ identifier, directory });
        // overwrite the source file with the reassembled file, and then split and reassemble that
        let reassembledFile = path.join(directory, identifier + "-tei-complete.xml");
        await copy(reassembledFile, sourceFile);
        // split and reassemble the previously reassembled file 
        await __processTeiTranscriptionXMLProcessor({
            directory,
            identifier,
            resource,
        });
        await assembleTeiDocument({ identifier, directory });
        // now compare the original source file (sourceSnapshot) with the final result (reassembledFile)
        const instance = [sourceSnapshot, reassembledFile];
        const schema = path.join(directory, "schematron.xml");
        await validateWithSchematron({instance, schema});
        // Clean up
        await remove(directory);
    });
});


function sampleDocument(identifier, page) {
   // NB some ingestion pathways produce <surface> documents containing <line> elements,
   // which represent a typographical line of text, with no other semantics.
   // These <line> elements are only valid inside a <surface>, in an "embedded" transcription.
   // See https://tei-c.org/release/doc/tei-p5-doc/en/html/PH.html#PHZLAB
   // In the reconstituted TEI file we need to convert these to regular transcriptional elements.
   // A sequence of <line> elements is replaced with an <ab> (anonymous block), containing 
   // the content of each <line>, separated by an <lb/>
    return `<surface xmlns="http://www.tei-c.org/ns/1.0" xml:id="${identifier}-${page}">
    <line>blah blah 1</line>
    <line>blah blah 2</line>
    <label>NATIVE <unclear>VOCABULARY.</unclear></label>
    <line>blah blah blah 3</line>
    <line>blah blah blah 4</line>
    <line>blah blah blah 5</line>
</surface>`;
}

function roCrateFile() {
    return {
        "@context": [
            "https://w3id.org/ro/crate/1.1/context",
            {
                "@vocab": "http://schema.org/",
            },
            {
                txc: "https://purl.archive.org/textcommons/terms#",
            },
            {
                "@base": null,
            },
        ],
        "@graph": [
            {
                "@id": "ro-crate-metadata.json",
                "@type": "CreativeWork",
                conformsTo: {
                    "@id": "https://w3id.org/ro/crate/1.1",
                },
                about: {
                    "@id": "./",
                },
                identifier: "ro-crate-metadata.json",
            },
            {
                "@id": "./",
                "@type": ["Dataset"],
                name: "My Research Object Crate",
            },
        ],
    };
}
