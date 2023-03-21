import path from "path";
import { readdir, remove, readJSON } from "fs-extra";
import { prepare, cleanup } from "./index.js";
import { runTextractOCR } from "./ocr-processing";
import { getStoreHandle, getS3Handle } from "/srv/api/src/common/index.js";
import { Textract } from "../common/textract.js";
import Chance from "chance";
const chance = new Chance();

describe(`Test Textract OCR processing`, () => {
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

        let store = await getStoreHandle({ id: identifier, type: "test" });
        await store.createObject();
        await store.put({
            localPath: path.join("src", "test-data", "image-processing", resource),
            target: resource,
        });

        let directory = await prepare({ identifier, task, resource, type: "test" });

        await runTextractOCR({ directory, identifier, resource, type: "test" });
        let contents = await readdir(path.join(directory, identifier));

        expect(contents.sort()).toEqual([
            "test-image-text.jpg",
            "test-image-text.tei.xml",
            "test-image-text.textract_ocr-ADMIN.json",
        ]);

        await cleanup({ directory, identifier, type: "test" });

        await remove(directory);
        await bucket.removeObjects({ prefix: store.getObjectPath() });
    }, 10000);
    it(`should be able send an image with a table to textract for OCR and get a result`, async () => {
        const identifier = chance.word();
        const task = {
            id: chance.word(),
        };
        const resource = "test-image-table-1.jpg";

        let store = await getStoreHandle({ id: identifier, type: "test" });
        await store.createObject();
        await store.put({
            localPath: path.join("src", "test-data", "image-processing", resource),
            target: resource,
        });

        let directory = await prepare({ identifier, task, resource, type: "test" });

        await runTextractOCR({
            task: "table",
            directory,
            identifier,
            resource,
            type: "test",
        });
        let contents = await readdir(path.join(directory, identifier));

        expect(contents.sort()).toEqual([
            "test-image-table-1.jpg",
            "test-image-table-1.tei.xml",
            "test-image-table-1.textract_ocr-ADMIN.json",
        ]);

        await cleanup({ directory, identifier, type: "test" });

        await remove(directory);
        await bucket.removeObjects({ prefix: store.getObjectPath() });
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
            '<surface xmlns="http://www.tei-c.org/ns/1.0" xml:id="Bates34-001">',
            "<line>Bounding Box</line>",
            "<line>A bounding box (BoundingBox) has the following properties:</line>",
            "<line>Height - The height of the bounding box as a ratio of the overall document page height.</line>",
            "<line>Left - The X coordinate of the top-left point of the bounding box as a ratio of the overall document page width.</line>",
            "<line>Top - The Y coordinate of the top-left point of the bounding box as a ratio of the overall document page height.</line>",
            "<line>Width - The width of the bounding box as a ratio of the overall document page width.</line>",
            "</surface>",
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
        let tables = textract.parseTables();
        expect(tables).toEqual([
            '<surface xmlns="http://www.tei-c.org/ns/1.0" xml:id="Bates34-001">',
            "<table>",
            "<row>",
            "<cell>A</cell><cell>B</cell><cell>1</cell><cell>2</cell>",
            "</row>",
            "<row>",
            "<cell>C</cell><cell>D</cell><cell>3</cell><cell>4</cell>",
            "</row>",
            "</table>",
            "</surface>",
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
        let tables = textract.parseTables();
        expect(tables).toEqual([
            '<surface xmlns="http://www.tei-c.org/ns/1.0" xml:id="Bates34-001">',
            "<line>+</line>",
            "<table>",
            "<row>",
            "<cell>AA</cell><cell><unclear>B B</unclear></cell><cell>11</cell><cell>22</cell>",
            "</row>",
            "<row>",
            "<cell>C</cell><cell>D</cell><cell>3</cell><cell>4</cell>",
            "</row>",
            "</table>",
            "</surface>",
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
        let tables = textract.parseTables();
        expect(tables).toEqual([
            '<surface xmlns="http://www.tei-c.org/ns/1.0" xml:id="Bates34-001">',
            "<line>+</line>",
            "<table>",
            "<row>",
            "<cell><unclear>AI</unclear> B</cell><cell>BA</cell><cell>12</cell><cell>21</cell><cell></cell>",
            "</row>",
            "<row>",
            "<cell>C</cell><cell>D</cell><cell>3</cell><cell>4</cell><cell></cell>",
            "</row>",
            "</table>",
            "</surface>",
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
        let tables = textract.parseTables();
        expect(tables).toEqual([
            '<surface xmlns="http://www.tei-c.org/ns/1.0" xml:id="Bates34-001">',
            "<table>",
            "<row>",
            "<cell>A</cell><cell>B</cell><cell>1</cell><cell>2</cell>",
            "</row>",
            "<row>",
            "<cell>C</cell><cell>D</cell><cell>3</cell><cell>4</cell>",
            "</row>",
            "</table>",
            "<table>",
            "<row>",
            "<cell>A</cell><cell>B</cell><cell>1</cell><cell>2</cell>",
            "</row>",
            "<row>",
            "<cell>C</cell><cell>D</cell><cell>3</cell><cell>4</cell>",
            "</row>",
            "</table>",
            "</surface>",
        ]);
    });
    it(`should be able process a textract document with text and a table - sample 5`, async () => {
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
        let data = textract.parseTables();
        expect(data).toEqual([
            '<surface xmlns="http://www.tei-c.org/ns/1.0" xml:id="Bates34-001">',
            "<line>The quick brown fox jumped over the lazy dog</line>",
            "<line>+</line>",
            "<table>",
            "<row>",
            "<cell>A</cell><cell>B</cell><cell>1</cell><cell>2</cell><cell></cell>",
            "</row>",
            "<row>",
            "<cell>C</cell><cell>D</cell><cell>3</cell><cell>4</cell><cell></cell>",
            "</row>",
            "</table>",
            "</surface>",
        ]);
    });
});
