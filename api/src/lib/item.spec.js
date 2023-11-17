require("regenerator-runtime");
import {
    createItem,
    lookupItemByIdentifier,
    deleteItem,
    linkItemToUser,
    getItems,
    listItemResources,
    getItemResource,
    getItemResourceLink,
    deleteItemResource,
    deleteItemPermissionForm,
    listItemPermissionForms,
    listItemResourceFiles,
    itemResourceExists,
    markResourceComplete,
    markAllResourcesComplete,
    getResourceStatus,
    updateResourceStatus,
    saveItemTranscription,
} from "./item";
const chance = require("chance").Chance();
import { resourceStatusFile } from "../common/index.js";
import { TestSetup, setupTestItem } from "../common/test-utils.js";
import { getStoreHandle } from "../common/getS3Handle";
import models from "../models";

describe("Item management tests", () => {
    let configuration, users, userEmail, adminEmail, bucket;
    let identifier, store;
    const tester = new TestSetup();

    beforeAll(async () => {
        ({ userEmail, adminEmail, configuration, bucket } = await tester.setupBeforeAll());
        users = await tester.setupUsers({ emails: [userEmail], adminEmails: [adminEmail] });
    });
    beforeEach(async () => {
        identifier = chance.word();
        store = await getStoreHandle({
            id: identifier,
            type: "item",
        });
    });
    afterEach(async () => {
        try {
            await store.deleteItem();
        } catch (error) {}
    });
    afterAll(async () => {
        await tester.purgeUsers({ users });
        await tester.teardownAfterAll(configuration);
    });
    it("should be able to create a new item", async () => {
        let user = users.filter((u) => !u.administrator)[0];
        let item = await createItem({ identifier, userId: user.id });
        expect(item.identifier).toEqual(identifier);
        let files = await store.listResources();
        expect(files.length).toEqual(4);
        files = files.map((c) => c.Key).sort();
        expect(files).toEqual([
            ".item-status.json",
            "nocfl.identifier.json",
            "nocfl.inventory.json",
            "ro-crate-metadata.json",
        ]);
        await item.destroy();
    });
    it("should not be able to create a new item with the same identifier as an existing item", async () => {
        let user = users.filter((u) => !u.administrator)[0];
        let item = await createItem({ identifier, userId: user.id });
        expect(item.identifier).toEqual(identifier);
        try {
            item = await createItem({ identifier, userId: user.id });
        } catch (error) {
            expect(error.message).toEqual("An item with that identifier already exists.");
        }
        await item.destroy();
    });
    it("should find an existing item by identifier", async () => {
        let user = users.filter((u) => !u.administrator)[0];

        let item = await createItem({ identifier, userId: user.id });
        item = await lookupItemByIdentifier({ identifier, userId: user.id });
        expect(item.identifier).toEqual(identifier);
        await item.destroy();
    });
    it("should not find an existing item by identifier", async () => {
        let user = users.filter((u) => !u.administrator)[0];
        let item = await lookupItemByIdentifier({ identifier: "monkeys", userId: user.id });
        expect(item).toBeNull;
    });
    it("should be able to delete an item", async () => {
        let user = users.filter((u) => !u.administrator)[0];
        let item = await createItem({ identifier, userId: user.id });
        await deleteItem({ id: item.id });
        item = await lookupItemByIdentifier({ identifier, userId: user.id });
        expect(item).toBeNull;
    });
    it("should be able to link an item to a user", async () => {
        let user = users.filter((u) => !u.administrator)[0];
        let item = await createItem({ identifier, userId: user.id });

        await linkItemToUser({ itemId: item.id, userId: user.id });

        item = await models.item.findOne({ where: { identifier } });
        expect((await item.getUsers()).length).toBe(1);

        await item.destroy();
    });
    it("should be able to get own items", async () => {
        let user = users.filter((u) => !u.administrator)[0];
        let item = await createItem({ identifier, userId: user.id });

        let items = await getItems({ userId: user.id });
        expect(items.count).toEqual(1);

        await item.destroy();
    });
    it("should find no items using pagination", async () => {
        let user = users.filter((u) => !u.administrator)[0];
        let item = await createItem({ identifier, userId: user.id });

        let link = await linkItemToUser({ itemId: item.id, userId: user.id });
        let items = await getItems({ userId: user.id, offset: 10 });
        expect(items.rows.length).toEqual(0);
        items = await getItems({ userId: user.id, limit: 0 });
        expect(items.rows.length).toEqual(1);

        await item.destroy();
    });
    it("should be able to list item resources in S3", async () => {
        let user = users.filter((u) => !u.administrator)[0];
        let { item } = await setupTestItem({ identifier, store, user });

        let { resources, total } = await listItemResources({ identifier });
        expect(resources.length).toEqual(2);
        expect(total).toEqual(2);
        expect(resources[0].name).toEqual(`${identifier}-01`);
        expect(resources[1].name).toEqual(`${identifier}-02`);

        await item.destroy();
    });
    it("should be able to list item resource files from S3", async () => {
        let user = users.filter((u) => !u.administrator)[0];
        let { item } = await setupTestItem({ identifier, store, user });

        let { files } = await listItemResourceFiles({ identifier, resource: `${identifier}-01` });
        expect(files.length).toEqual(2);

        await item.destroy();
    });
    it("should see if an item resource exists", async () => {
        let user = users.filter((u) => !u.administrator)[0];
        let { item } = await setupTestItem({ identifier, store, user });

        let stat = await itemResourceExists({ identifier, resource: `${identifier}-01.json` });
        expect(stat.$metadata.httpStatusCode).toEqual(200);

        stat = await itemResourceExists({ identifier, resource: `${identifier}-001.json` });
        expect(stat).toBeFalse;

        await item.destroy();
    });
    it("should be able to get a resource file from S3", async () => {
        let user = users.filter((u) => !u.administrator)[0];
        let { item } = await setupTestItem({ identifier, store, user });

        let data = await getItemResource({ identifier, resource: `${identifier}-01.json` });
        expect(data).toEqual(JSON.stringify({ some: "thing" }));

        await item.destroy();
    });
    it("should be able to delete an item resource", async () => {
        let user = users.filter((u) => !u.administrator)[0];
        let { item } = await setupTestItem({ identifier, store, user });

        let { resources } = await listItemResources({ identifier });
        expect(resources.length).toEqual(2);

        await deleteItemResource({ identifier, resource: `${identifier}-01` });
        ({ resources } = await listItemResources({ identifier }));
        expect(resources.length).toEqual(1);
        await item.destroy();
    });
    it("should fail to get an item resource from S3", async () => {
        let user = users.filter((u) => !u.administrator)[0];
        let { item } = await setupTestItem({ identifier, store, user });

        try {
            let data = await getItemResource({ identifier, resource: "notfound.json" });
        } catch (error) {
            expect(error.message).toEqual("Not found");
        }

        await item.destroy();
    });
    it("should be able to get an item resource link", async () => {
        let user = users.filter((u) => !u.administrator)[0];
        let { item } = await setupTestItem({ identifier, store, user });

        let data = await getItemResourceLink({ identifier, resource: `${identifier}-01.json` });
        expect(data).toMatch("http://s3:9000");

        await item.destroy();
    });
    it("should fail to get an item resource link", async () => {
        let user = users.filter((u) => !u.administrator)[0];
        let { item } = await setupTestItem({ identifier, store, user });

        try {
            let data = await getItemResourceLink({ identifier, resource: "notfound.json" });
        } catch (error) {
            expect(error.message).toEqual("Not found");
        }

        await item.destroy();
    });
    it("should be able to update resource completed status", async () => {
        let user = users.filter((u) => !u.administrator)[0];
        let { item } = await setupTestItem({ identifier, store, user });

        await markResourceComplete({ identifier, resource: `${identifier}-01`, complete: true });
        let status = await getResourceStatus({ identifier, resource: `${identifier}-01` });
        expect(status).toEqual({ status: { tei: {}, complete: true } });

        await markResourceComplete({ identifier, resource: `${identifier}-01`, complete: false });
        status = await getResourceStatus({ identifier, resource: `${identifier}-01` });
        expect(status).toEqual({ status: { tei: {}, complete: false } });

        await item.destroy();
        await bucket.removeObjects({ prefix: identifier });
    });
    it("should be able to mark all resources as complete", async () => {
        let user = users.filter((u) => !u.administrator)[0];
        let { item } = await setupTestItem({ identifier, store, user });

        await markAllResourcesComplete({
            identifier,
            resources: [`${identifier}-01`],
            complete: true,
        });
        let status = await getResourceStatus({ identifier, resource: `${identifier}-01` });
        expect(status).toEqual({ status: { tei: {}, complete: true } });

        await item.destroy();
        await bucket.removeObjects({ prefix: identifier });
    });
    it("should be able to update resource status", async () => {
        let user = users.filter((u) => !u.administrator)[0];
        let { item } = await setupTestItem({ identifier, store, user });

        let statusFile = await store.getJSON({ target: resourceStatusFile });
        statusFile = await updateResourceStatus({
            identifier,
            resource: `${identifier}-01`,
            statusFile,
        });
        expect(statusFile.resources[`${identifier}-01`]).toEqual({
            complete: false,
            thumbnail: false,
            webformats: false,
            textract: false,
            tei: {
                exists: false,
                wellFormed: false,
            },
        });
    });
    it("should be able to list item permission forms", async () => {
        let user = users.filter((u) => !u.administrator)[0];
        let { item } = await setupTestItem({ identifier, store, user });
        await store.put({ json: {}, target: `${identifier}-rights-holder-permission.pdf` });
        await store.put({
            json: {},
            target: `${identifier}-language-authority-permission.pdf`,
        });

        let { files } = await listItemPermissionForms({ identifier });
        expect(files.length).toEqual(2);
        await item.destroy();
        await bucket.removeObjects({ prefix: identifier });
    });
    it("should be able to delete item permission forms", async () => {
        let user = users.filter((u) => !u.administrator)[0];
        let { item } = await setupTestItem({ identifier, store, user });
        await store.put({ json: {}, target: `${identifier}-rights-holder-permission.pdf` });
        await store.put({
            json: {},
            target: `${identifier}-language-authority-permission.pdf`,
        });

        await deleteItemPermissionForm({
            identifier,
            form: `${identifier}-rights-holder-permission.pdf`,
        });
        let { files } = await listItemPermissionForms({ identifier });
        expect(files.length).toEqual(1);
        await item.destroy();
        await bucket.removeObjects({ prefix: identifier });
    });
    it("should be able to save an item transcription", async () => {
        let user = users.filter((u) => !u.administrator)[0];
        let { item } = await setupTestItem({ identifier, store, user });
        const resource = `${identifier}-01`;

        await saveItemTranscription({
            identifier,
            resource,
            document: `<xml></xml>`,
        });
        let { status } = await getResourceStatus({ identifier, resource });
        expect(status).toEqual({
            complete: false,
            thumbnail: false,
            webformats: false,
            textract: false,
            tei: { exists: true, wellFormed: true },
        });

        await saveItemTranscription({
            identifier,
            resource,
            document: `<xml></xm`,
        });
        ({ status } = await getResourceStatus({ identifier, resource }));
        expect(status).toMatchObject({
            complete: false,
            thumbnail: false,
            webformats: false,
            textract: false,
            tei: { exists: true, wellFormed: false, error: "Unclosed root tag at line 0 column 9" },
        });
    });
});
