import "regenerator-runtime";
import { CrateManager } from "./helper-methods";

describe("Test loading crate files and converting to a JSON DB", () => {
    it("should be able to load in a basic crate file", () => {
        let crate = getBasicCrate();

        let crateManager = new CrateManager({ crate });
        crateManager.init();
    });
});

function getBasicCrate() {
    let context = ["https://w3id.org/ro/crate/1.1/context"];
    let graph = [
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
            name: "test crate",
        },
    ];
    return {
        "@context": context,
        "@graph": graph,
    };
}
