import path from "path";
import { readdir, remove, readJSON } from "fs-extra";
import { groupBy, orderBy, flattenDeep, compact } from "lodash";
import { prepare, cleanup } from "./index.js";
import { runTextractOCR } from "./ocr-processing";
import { getStoreHandle, getS3Handle } from "../common";
import Chance from "chance";
const chance = new Chance();

class Textract {
    constructor({ identifier, resource, document }) {
        this.document = document;
        this.surface = `<surface xmlns="http://www.tei-c.org/ns/1.0" xml:id="${identifier}-${resource}"></surface>`;
        this.minConfidence = 70;
    }
    parseSimpleDocument() {
        let words = this.document.Blocks.filter((b) => b.BlockType === "WORD");
        let wordsGroupedById = groupBy(words, "Id");

        let text = [];
        let lines = this.document.Blocks.filter((b) => b.BlockType === "LINE").map((line) => {
            line = line.Relationships.map((r) => {
                return r.Ids.map((id) => {
                    if (wordsGroupedById[id][0].Confidence > this.minConfidence) {
                        return wordsGroupedById[id][0].Text;
                    } else {
                        return `<unclear>${wordsGroupedById[id][0].Text}</unclear>`;
                    }
                });
            });
            line = flattenDeep(line);
            text.push(`<line>${line.join(" ")}</line>`);
        });

        return text;
    }

    parseTable() {
        let wordInTable = [];

        // get all the tables
        let tables = this.document.Blocks.filter((b) => b.BlockType === "TABLE");
        let words = this.document.Blocks.filter((b) => b.BlockType === "WORD");

        let blocksGroupedById = groupBy(this.document.Blocks, "Id");
        let wordsGroupedById = groupBy(words, "Id");

        // for each table
        tables = tables.map((table) => {
            let cells = table.Relationships.filter((type) => type.Type === "CHILD")[0].Ids.map(
                (id) => blocksGroupedById[id][0]
            );

            let rows = groupBy(cells, "RowIndex");
            let t = ["<table>"];
            for (let row of Object.keys(rows)) {
                row = orderBy(rows[row], "ColumnIndex");

                let cells = row.map((cell) => {
                    cell = cell?.Relationships?.map((r) => {
                        return r.Ids.map((id) => {
                            wordInTable.push(wordsGroupedById[id][0]);
                            if (wordsGroupedById[id][0].Confidence > this.minConfidence) {
                                return wordsGroupedById[id][0].Text;
                            } else {
                                return `<unclear>${wordsGroupedById[id][0].Text}</unclear>`;
                            }
                        });
                    });
                    cell = flattenDeep(cell).join(" ");
                    return `<cell>${cell}</cell>`;
                });
                t.push(`<row>`);
                t.push(`${cells.join("")}`);
                t.push(`</row>`);
            }
            t.push("</table>");
            return t;
        });

        // extract the non tabular content
        wordInTable = groupBy(wordInTable, "Id");
        let text = [];
        let lines = this.document.Blocks.filter((b) => b.BlockType === "LINE").map((line) => {
            line = line.Relationships.map((r) => {
                return r.Ids.map((id) => {
                    if (!wordInTable[id]) {
                        if (wordsGroupedById[id][0].Confidence > this.minConfidence) {
                            return wordsGroupedById[id][0].Text;
                        } else {
                            return `<unclear>${wordsGroupedById[id][0].Text}</unclear>`;
                        }
                    }
                });
            });
            line = flattenDeep(line);
            line = compact(line);
            if (line.length) {
                text.push(`<line>${line.join(" ")}</line>`);
            }
        });

        // console.log(wordInTable);
        return [...text, ...flattenDeep(tables)];
    }

    extractWords() {
        let words = this.document.Blocks.filter((b) => b.BlockType === "WORD");
        // console.log(words);
    }
}
describe(`Test `, () => {
    let bucket;
    beforeAll(async () => {
        ({ bucket } = await getS3Handle());
    });

    it(`should be able send an image containing text to textract for OCR and get a result`, async () => {
        const identifier = chance.word();
        const task = {
            id: chance.word(),
        };
        const resource = "test-image-text.jpg";

        let store = await getStoreHandle({ id: identifier, className: "test" });
        await store.createItem();
        await store.put({
            localPath: path.join("src", "test-data", "image-processing", resource),
            target: resource,
        });

        let directory = await prepare({ identifier, task, resource, className: "test" });

        await runTextractOCR({ directory, identifier, resource, className: "test" });
        let contents = await readdir(path.join(directory, identifier));

        expect(contents.sort()).toEqual([
            "test-image-text.jpg",
            "test-image-text.textract_ocr-ADMIN.json",
        ]);

        await cleanup({ directory, identifier, className: "test" });

        await remove(directory);
        await bucket.removeObjects({ prefix: store.getItemPath() });
    });
    it(`should be able send an image with a table to textract for OCR and get a result`, async () => {
        const identifier = chance.word();
        const task = {
            id: chance.word(),
        };
        const resource = "test-image-table-1.jpg";

        let store = await getStoreHandle({ id: identifier, className: "test" });
        await store.createItem();
        await store.put({
            localPath: path.join("src", "test-data", "image-processing", resource),
            target: resource,
        });

        let directory = await prepare({ identifier, task, resource, className: "test" });

        await runTextractOCR({
            task: "table",
            directory,
            identifier,
            resource,
            className: "test",
        });
        let contents = await readdir(path.join(directory, identifier));

        expect(contents.sort()).toEqual([
            "test-image-table-1.jpg",
            "test-image-table-1.textract_ocr-ADMIN.json",
        ]);

        await cleanup({ directory, identifier, className: "test" });

        await remove(directory);
        await bucket.removeObjects({ prefix: store.getItemPath() });
    });
    it(`should be able process a textract document without tables`, async () => {
        const identifier = "Bates34";
        const resource = "001";
        let document = await readJSON(
            path.join("src", "test-data", "textract-samples", "textract-sample-no-table.json")
        );
        let textract = new Textract({ identifier, resource, document });
        let lines = textract.parseSimpleDocument();
        expect(lines).toEqual([
            "<line>Bounding Box</line>",
            "<line>A bounding box (BoundingBox) has the following properties:</line>",
            "<line>Height - The height of the bounding box as a ratio of the overall document page height.</line>",
            "<line>Left - The X coordinate of the top-left point of the bounding box as a ratio of the overall document page width.</line>",
            "<line>Top - The Y coordinate of the top-left point of the bounding box as a ratio of the overall document page height.</line>",
            "<line>Width - The width of the bounding box as a ratio of the overall document page width.</line>",
        ]);
    });
    it(`should be able process a textract document with tables - sample 1`, async () => {
        // 1 table
        // 2 rows
        // 4 cells per row
        // single character per cell, no duplicates
        const identifier = "Bates34";
        const resource = "001";
        let document = await readJSON(
            path.join("src", "test-data", "textract-samples", "textract-sample-table-1.json")
        );
        let textract = new Textract({ identifier, resource, document });
        let tables = textract.parseTable();
        expect(tables).toEqual([
            [
                "<table>",
                "<row>",
                "<cell>A</cell><cell>B</cell><cell>1</cell><cell>2</cell>",
                "</row>",
                "<row>",
                "<cell>C</cell><cell>D</cell><cell>3</cell><cell>4</cell>",
                "</row>",
                "</table>",
            ],
        ]);
    });
    it(`should be able process a textract document with tables - sample 2`, async () => {
        // 1 table
        // 2 rows
        // 4 cells per row
        // dual characters per cell, duplicated, first row
        const identifier = "Bates34";
        const resource = "001";
        let document = await readJSON(
            path.join("src", "test-data", "textract-samples", "textract-sample-table-2.json")
        );
        let textract = new Textract({ identifier, resource, document });
        let tables = textract.parseTable();
        expect(tables).toEqual([
            [
                "<table>",
                "<row>",
                "<cell>AA</cell><cell><unclear>B B</unclear></cell><cell>11</cell><cell>22</cell>",
                "</row>",
                "<row>",
                "<cell>C</cell><cell>D</cell><cell>3</cell><cell>4</cell>",
                "</row>",
                "</table>",
            ],
        ]);
    });
    it(`should be able process a textract document with tables - sample 3`, async () => {
        // 1 table
        // 2 rows
        // 4 cells per row
        // dual characters per cell, duplicates of chars in other cells, first row
        const identifier = "Bates34";
        const resource = "001";
        let document = await readJSON(
            path.join("src", "test-data", "textract-samples", "textract-sample-table-3.json")
        );
        let textract = new Textract({ identifier, resource, document });
        let tables = textract.parseTable();
        expect(tables).toEqual([
            [
                "<table>",
                "<row>",
                "<cell><unclear>AI</unclear> B</cell><cell>BA</cell><cell>12</cell><cell>21</cell><cell></cell>",
                "</row>",
                "<row>",
                "<cell>C</cell><cell>D</cell><cell>3</cell><cell>4</cell><cell></cell>",
                "</row>",
                "</table>",
            ],
        ]);
    });
    it(`should be able process a textract document with tables - sample 4`, async () => {
        // 2 tables
        // 2 rows each
        // 4 cells per row
        // single char per cell, no duplicated within table - duplicates across
        const identifier = "Bates34";
        const resource = "001";
        let document = await readJSON(
            path.join("src", "test-data", "textract-samples", "textract-sample-table-4.json")
        );
        let textract = new Textract({ identifier, resource, document });
        let tables = textract.parseTable();
        expect(tables).toEqual([
            [
                "<table>",
                "<row>",
                "<cell>A</cell><cell>B</cell><cell>1</cell><cell>2</cell>",
                "</row>",
                "<row>",
                "<cell>C</cell><cell>D</cell><cell>3</cell><cell>4</cell>",
                "</row>",
                "</table>",
            ],
            [
                "<table>",
                "<row>",
                "<cell>A</cell><cell>B</cell><cell>1</cell><cell>2</cell>",
                "</row>",
                "<row>",
                "<cell>C</cell><cell>D</cell><cell>3</cell><cell>4</cell>",
                "</row>",
                "</table>",
            ],
        ]);
    });
    it.only(`should be able process a textract document with text and a table - sample 5`, async () => {
        // 1 line of text
        // 1 table
        // 2 rows
        // 4 cells per row
        // single character per cell, no duplicates
        const identifier = "Bates34";
        const resource = "001";
        let document = await readJSON(
            path.join("src", "test-data", "textract-samples", "textract-sample-table-5.json")
        );
        let textract = new Textract({ identifier, resource, document });
        let words = textract.extractWords();
        let tables = textract.parseTable();
        console.log(tables);
    });
});
