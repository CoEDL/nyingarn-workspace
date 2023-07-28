import { assembleTeiDocument } from "./assemble-tei.js";
import path from "path";
import { ensureDir, copy, remove, writeFile, writeJSON, readdir } from "fs-extra";
import Chance from "chance";
const chance = new Chance();

describe(`Test assembling a TEI file from the stub files`, () => {
    it(`Should be able to assemble a simple TEI file from the stub files`, async () => {
        const identifier = "test"; //chance.word();
        //const directory = path.join("/tmp", chance.word());
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
        const directory = "/tmp/test";
        await ensureDir(directory);
        const sourceFolder = path.join(__dirname, "../test-data/reconstitute-tei/structured");
        await copy(sourceFolder, directory);
        // assemble the source files into a new TEI file
        const identifier = "structured";
        await assembleTeiDocument({ identifier, directory });
        //await remove(directory);
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
