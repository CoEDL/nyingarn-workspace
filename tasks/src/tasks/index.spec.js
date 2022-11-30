import path from "path";
import { ensureDir, copy, readdir, remove, pathExists } from "fs-extra";
import {
    removeOverlappingNewContent,
    prepare,
    cleanup,
    cleanupAfterFailure,
    syncToBucket,
} from "./index.js";
import { getStoreHandle, getS3Handle } from "/srv/api/src/common/index.js";
import Chance from "chance";
const chance = new Chance();

describe(`Test `, () => {
    let bucket;
    beforeAll(async () => {
        ({ bucket } = await getS3Handle());
    });

    it(`should be able to remove local content that overlaps with what's in the store`, async () => {
        const identifier = chance.word();
        const directory = path.join("/tmp", chance.word());
        const resource = `${identifier}-01.tiff`;

        let store = await getStoreHandle({ id: identifier, className: "test" });
        await store.createItem();

        await ensureDir(directory);
        await store.put({ localPath: path.join("src", "tasks", "index.js"), target: "index.js" });

        await copy(
            path.join("src", "tasks", "index.js"),
            path.join(directory, identifier, "index.js")
        );
        await copy(
            path.join("src", "tasks", "index.spec.js"),
            path.join(directory, identifier, "index.spec.js")
        );
        await removeOverlappingNewContent({ directory, identifier, className: "test" });

        let contents = await readdir(path.join(directory, identifier));
        expect(contents).toEqual(["index.spec.js"]);

        await remove(directory);
        await bucket.removeObjects({ prefix: store.getItemPath() });
    });
    it(`should be able to setup a local working directory`, async () => {
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

        let contents = await readdir(path.join(directory, identifier));
        expect(contents).toEqual([resource]);

        await remove(directory);
        await bucket.removeObjects({ prefix: store.getItemPath() });
    });
    it(`should be able to cleanup a local working directory`, async () => {
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

        await cleanup({ directory, identifier, className: "test" });
        expect(await pathExists(directory)).toBe(false);

        let resources = await store.listResources();
        expect(resources.length).toEqual(4);
        expect(resources.map((r) => r.Key).sort()).toEqual([
            "nocfl.identifier.json",
            "nocfl.inventory.json",
            "ro-crate-metadata.json",
            resource,
        ]);
        await bucket.removeObjects({ prefix: store.getItemPath() });
    });
    it(`should be able to sync a local working directory to the store`, async () => {
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
        // console.log(directory);
        await copy(
            path.join("src", "tasks", "index.js"),
            path.join(directory, identifier, "index.js")
        );
        await copy(
            path.join("src", "tasks", "index.spec.js"),
            path.join(directory, identifier, "index.spec.js")
        );

        await syncToBucket({ directory, identifier, className: "test" });
        let resources = await store.listResources();
        expect(resources.length).toEqual(6);
        expect(resources.map((r) => r.Key).sort()).toEqual([
            "index.js",
            "index.spec.js",
            "nocfl.identifier.json",
            "nocfl.inventory.json",
            "ro-crate-metadata.json",
            resource,
        ]);
        await remove(directory);
        await bucket.removeObjects({ prefix: store.getItemPath() });
    });
});
