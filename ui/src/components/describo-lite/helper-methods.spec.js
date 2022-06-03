import "regenerator-runtime";
import { CrateManager } from "./helper-methods";
import { faker } from "@faker-js/faker";
import { range, round, compact, groupBy, random } from "lodash";
import { performance } from "perf_hooks";

describe("Test loading / exporting crate files", () => {
    test("base crate file", async () => {
        let crate = getBaseCrate();

        let crateManager = new CrateManager({ crate });
        crateManager.init();

        let exportedCrate = crateManager.exportCrate();
        expect(crate).toEqual(exportedCrate);
    });
    test("with root dataset, one type", async () => {
        let crate = getBaseCrate();
        crate["@graph"].push({
            "@id": "./",
            "@type": ["Dataset"],
            name: "Dataset",
        });

        let crateManager = new CrateManager({ crate });
        crateManager.init();

        let exportedCrate = crateManager.exportCrate();
        exportedCrate["@graph"] = exportedCrate["@graph"].map((e) => {
            delete e["@reverse"];
            return e;
        });
        expect(crate).toEqual(exportedCrate);
    });
    test("with root dataset, multiple types", async () => {
        let crate = getBaseCrate();
        crate["@graph"].push({
            "@id": "./",
            "@type": ["Dataset", "Something Else"],
            name: "Dataset",
        });

        let crateManager = new CrateManager({ crate });
        crateManager.init();

        let exportedCrate = crateManager.exportCrate();
        exportedCrate["@graph"] = exportedCrate["@graph"].map((e) => {
            delete e["@reverse"];
            return e;
        });
        expect(crate).toEqual(exportedCrate);
    });
    test("with root dataset and one text property", async () => {
        let crate = getBaseCrate();
        crate["@graph"].push({
            "@id": "./",
            "@type": ["Dataset"],
            name: "Dataset",
            text: "some text",
        });

        let crateManager = new CrateManager({ crate });
        crateManager.init();

        let exportedCrate = crateManager.exportCrate();
        exportedCrate["@graph"] = exportedCrate["@graph"].map((e) => {
            delete e["@reverse"];
            return e;
        });
        expect(crate).toEqual(exportedCrate);
    });
    test("with root dataset and one text property in array", async () => {
        let crate = getBaseCrate();
        crate["@graph"].push({
            "@id": "./",
            "@type": ["Dataset"],
            name: "Dataset",
            text: ["some text"],
        });

        let crateManager = new CrateManager({ crate });
        crateManager.init();

        let exportedCrate = crateManager.exportCrate();
        let rootDataset = exportedCrate["@graph"].filter((e) => e["@id"] === "./");
        expect(rootDataset).toEqual([
            {
                "@id": "./",
                "@type": ["Dataset"],
                name: "Dataset",
                text: "some text",
                "@reverse": {},
            },
        ]);
    });
    test("with root dataset and one reference to another object", async () => {
        let crate = getBaseCrate();
        crate["@graph"].push({
            "@id": "./",
            "@type": ["Dataset"],
            name: "Dataset",
            author: { "@id": "http://entity.com/something" },
        });
        crate["@graph"].push({
            "@id": "http://entity.com/something",
            "@type": "Person",
            name: "Person",
        });

        let crateManager = new CrateManager({ crate });
        crateManager.init();

        let exportedCrate = crateManager.exportCrate();
        let rootDataset = exportedCrate["@graph"].filter((e) => e["@id"] === "./");
        expect(rootDataset).toEqual([
            {
                "@id": "./",
                "@type": ["Dataset"],
                name: "Dataset",
                author: { "@id": "http://entity.com/something" },
                "@reverse": {},
            },
        ]);

        let entity = exportedCrate["@graph"].filter(
            (e) => e["@id"] === "http://entity.com/something"
        );
        expect(entity).toEqual([
            {
                "@id": "http://entity.com/something",
                "@type": "Person",
                name: "Person",
                "@reverse": { author: { "@id": "./" } },
            },
        ]);
    });
    test("with root dataset and one reference to object not in crate", async () => {
        let crate = getBaseCrate();
        crate["@graph"].push({
            "@id": "./",
            "@type": ["Dataset"],
            name: "Dataset",
            author: { "@id": "http://entity.com/something" },
        });

        let crateManager = new CrateManager({ crate });
        crateManager.init();

        let exportedCrate = crateManager.exportCrate();
        let rootDataset = exportedCrate["@graph"].filter((e) => e["@id"] === "./");
        expect(rootDataset).toEqual([
            {
                "@id": "./",
                "@type": ["Dataset"],
                name: "Dataset",
                author: { "@id": "http://entity.com/something" },
                "@reverse": {},
            },
        ]);

        let entity = exportedCrate["@graph"].filter(
            (e) => e["@id"] === "http://entity.com/something"
        );
        expect(entity).toEqual([]);
    });
    test("with root dataset and mixed type values for a property", async () => {
        let crate = getBaseCrate();
        crate["@graph"].push({
            "@id": "./",
            "@type": ["Dataset"],
            name: "Dataset",
            author: [{ "@id": "http://entity.com/something" }, "some text"],
        });
        crate["@graph"].push({
            "@id": "http://entity.com/something",
            "@type": "Person",
            name: "Person",
        });

        let crateManager = new CrateManager({ crate });
        crateManager.init();

        let exportedCrate = crateManager.exportCrate();
        let rootDataset = exportedCrate["@graph"].filter((e) => e["@id"] === "./");
        expect(rootDataset[0].author).toEqual([
            {
                "@id": "http://entity.com/something",
            },
            "some text",
        ]);
    });
});

describe.skip("Test loading large crates and see how it performs", () => {
    test("n = 10, 100, 500, 1000, 2000, 4000, 8000, 16000", async () => {
        const tests = [10, 100, 500, 1000, 2000, 4000, 8000, 16000];
        // const tests = [2];
        for (const total of tests) {
            let crate = getBaseCrate();
            crate["@graph"].push({
                "@id": "./",
                "@type": ["Dataset"],
                name: "Dataset",
            });

            let entities = crate["@graph"].map((e) => {
                return e?.about?.["@id"] === "./" ? null : e;
            });
            entities = compact(entities);
            const runtime = {};

            let t0 = performance.now();
            for (let i in range(total)) {
                let nEntities = entities.length;
                let pick = entities[random(0, nEntities - 1)];

                let entity = {
                    "@id": faker.internet.url(),
                    "@type": faker.helpers.arrayElement([
                        "Dataset",
                        "File",
                        "Person",
                        "Organisation",
                    ]),
                    name: faker.commerce.productDescription(),
                    [faker.word.noun()]: [{ "@id": pick["@id"] }],
                };
                crate["@graph"].push(entity);
                entities.push(entity);
            }

            let t1 = performance.now();
            runtime.generate = round(t1 - t0, 2);

            t0 = performance.now();
            let crateManager = new CrateManager({ crate });
            crateManager.init();
            t1 = performance.now();
            runtime.init = round(t1 - t0, 2);

            t0 = performance.now();
            let exportedCrate = crateManager.exportCrate();
            t1 = performance.now();
            runtime.export = round(t1 - t0, 2);

            console.log(
                `N items in crate: ${crate["@graph"].length}, generate: ${runtime.generate}ms, init: ${runtime.init}ms, export: ${runtime.export}ms`
            );
        }
    });
});

function getBaseCrate() {
    return {
        "@context": ["https://w3id.org/ro/crate/1.1/context"],
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
        ],
    };
}
