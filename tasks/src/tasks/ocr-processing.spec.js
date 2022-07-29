import path from "path";
import { ensureDir, copy, readdir, remove, pathExists } from "fs-extra";
import { prepare, cleanup } from "./index.js";
import { runTextractOCR } from "./ocr-processing";
import { getStoreHandle, getS3Handle } from "../common";
import Chance from "chance";
const chance = new Chance();

describe(`Test `, () => {
    let bucket;
    beforeAll(async () => {
        ({ bucket } = await getS3Handle());
    });

    it.only(`should be able send an image to textract for OCR and get a result`, async () => {
        const identifier = chance.word();
        const task = {
            id: chance.word(),
        };
        const resource = "test-image.jpg";

        let store = await getStoreHandle({ id: identifier, className: "test" });
        await store.createItem();
        await store.put({
            localPath: path.join("src", "test-data", "image-processing", resource),
            target: resource,
        });

        let directory = await prepare({ identifier, task, resource, className: "test" });

        await runTextractOCR({ directory, identifier, resource, className: "test" });
        let contents = await readdir(path.join(directory, identifier));
        expect(contents.sort()).toEqual(["test-image.jpg", "test-image.textract_ocr-ADMIN.json"]);

        await cleanup({ directory, identifier, className: "test" });

        await remove(directory);
        await bucket.removeObjects({ prefix: store.getItemPath() });
    });
});
