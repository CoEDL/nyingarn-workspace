import { assembleTeiDocument } from "./assemble-tei.js";
import path from "path";
import { ensureDir, copy, remove, writeFile, writeJSON, readdir } from "fs-extra";
import Chance from "chance";
const chance = new Chance();

describe(`Test assembling a TEI file from the stub files`, () => {
    it(`Should be able to assemble a simple TEI file from the stub files`, async () => {
        const identifier = 'test'; //chance.word();
        //const directory = path.join("/tmp", chance.word());
        const directory = '/tmp/test';
        await ensureDir(directory);
        // let store = await getStoreHandle({ id: identifier, className: "item" });
        // await store.createItem();
        for (let i of ['01', '02', '03']) {
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
        await remove(directory);
        // await store.deleteItem({ prefix: store.getItemPath() });
    });

    it(`Should be able to assemble a complex TEI file from the stub files`, async () => {
        const identifier = 'structured'; 
        const directory = path.join(__dirname, '../test-data/reconstitute-tei/structured');
        await ensureDir(directory);
        await assembleTeiDocument({ identifier, directory });
        await remove(path.join(directory, 'structured-tei-complete.xml'));
    });
});

function sampleDocument(identifier, page) {
    return `
    <surface xmlns="http://www.tei-c.org/ns/1.0" xml:id="${identifier}-${page}">
    <line>
        NATIVE <unclear>VOCABULARY.</unclear>
    </line>
    <line>
        blah blah blah
    </line>
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
