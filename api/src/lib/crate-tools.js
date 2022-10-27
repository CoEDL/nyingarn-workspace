import { getStoreHandle } from "../common/index.js";
import path from "path";
import mime from "mime-types";
import { difference } from "lodash";

// TODO: this code does not have tests
export async function registerAllFiles({ id, className, crate }) {
    let store = await getStoreHandle({ id, className });

    // get list of files in the bucket
    const files = (await store.listResources()).filter((file) => {
        return ![
            "ro-crate-metadata.json",
            "nocfl.inventory.json",
            "nocfl.identifier.json",
        ].includes(file.Key);
    });

    // determine which files not already registered in the crate
    const filesInBucket = files.map((file) => file.Key);
    const filesInCrate = crate["@graph"]
        .filter((entity) => entity["@type"] === "File")
        .map((entity) => entity["@id"]);
    const filesToAdd = difference(filesInBucket, filesInCrate);

    // add an entry for each missing file
    for (let file of filesToAdd) {
        file = files.filter((f) => f.Key === file)[0];
        let entity = {
            "@id": file.Key,
            "@type": "File",
            name: file.Key,
            contentSize: file.Size,
            dateModified: file.LastModified,
            "@reverse": {
                hasPart: [{ "@id": "./" }],
            },
        };
        crate["@graph"].push(entity);
    }

    // link the missing files into the hasPart prop of the rootDataset
    let rootDescriptor = crate["@graph"].filter(
        (e) => e["@id"] === "ro-crate-metadata.json" && e["@type"] === "CreativeWork"
    )[0];
    crate["@graph"] = crate["@graph"].map((e) => {
        if (e["@id"] === rootDescriptor.about["@id"]) {
            e.hasPart = [...e.hasPart, ...filesToAdd.map((file) => ({ "@id": file }))];
        }
        return e;
    });

    // set the mimetype on all files in the crate
    crate["@graph"] = crate["@graph"].map((entity) => {
        return { encodingFormat: getMimeType(entity["@id"]), ...entity };
    });

    // upload the new crate file
    return { crate, filesAdded: filesToAdd };

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
