import { specialFiles } from "../common/index.js";
import path from "path";
import mime from "mime-types";
import lodashPkg from "lodash";
const { uniqBy } = lodashPkg;

// TODO: this code does not have tests
export async function registerAllFiles({ crate, resources }) {
    let files = resources.filter((file) => !specialFiles.includes(file.Key));
    files = files.filter((file) => !file.Key.match(/^\./));
    if (!files.length) return crate;

    for (let file of files) {
        let entity = crate.getEntity(file.Key);
        if (entity) crate.deleteEntity(file.Key);
        entity = {
            "@id": file.Key,
            "@type": "File",
            name: file.Key,
            contentSize: file.Size,
            dateModified: file.LastModified.toISOString(),
            "@reverse": {
                hasPart: [{ "@id": "./" }],
            },
        };
        crate.addEntity(entity);
        let parts = crate.rootDataset.hasPart;
        parts.push({ "@id": entity["@id"] });
        crate.rootDataset.hasPart = uniqBy(parts, "@id");
    }

    // set the mimetype on all files in the crate
    let entities = crate.entities();
    for (let entity of entities) {
        if (crate.hasType(entity, "File")) {
            entity = { encodingFormat: getMimeType(entity["@id"]), ...entity };
            crate.addEntity(entity, true);
        }
    }

    // upload the new crate file
    return crate;

    function getMimeType(filename) {
        let mimetype = mime.lookup(filename);
        if (!mimetype) {
            switch (path.extname(filename)) {
                case "eaf":
                case "flextext":
                case "trs":
                case "ixt":
                    mimetype = "applcation/xml";
            }
        }
        return mimetype;
    }
}

export function getContext() {
    return [
        "https://w3id.org/ro/crate/1.1/context",
        "http://purl.archive.org/language-data-commons/context.json",
        {
            "@vocab": "http://schema.org/",
        },
        {
            "@base": null,
        },
    ];
}

export function createDefaultROCrateFile({ name }) {
    return {
        "@context": getContext(),
        "@graph": [
            {
                "@id": "ro-crate-metadata.json",
                "@type": "CreativeWork",
                conformsTo: {
                    "@id": "https://w3id.org/ro/crate/1.1/context",
                },
                about: {
                    "@id": "./",
                },
            },
            {
                "@id": "./",
                "@type": "Dataset",
                name: name,
            },
        ],
    };
}
