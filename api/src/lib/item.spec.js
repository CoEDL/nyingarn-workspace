require("regenerator-runtime");
import { getS3Handle } from "../common";
import {
    createItem,
    lookupItemByIdentifier,
    deleteItem,
    linkItemToUser,
    getItems,
    getItemResources,
} from "./item";
const chance = require("chance").Chance();
import { setupBeforeAll, setupBeforeEach, teardownAfterAll, teardownAfterEach } from "../common";

describe("Item management tests", () => {
    let users, configuration;
    const userEmail = chance.email();
    const adminEmail = chance.email();
    beforeAll(async () => {
        configuration = await setupBeforeAll({ adminEmails: [adminEmail] });
    });
    beforeEach(async () => {
        users = await setupBeforeEach({ emails: [userEmail] });
    });
    afterEach(async () => {
        await teardownAfterEach({ users });
    });
    afterAll(async () => {
        await teardownAfterAll(configuration);
    });
    it("should be able to create a new item", async () => {
        let user = users[0];
        const identifier = chance.word();
        let item = await createItem({ identifier, userId: user.id });
        expect(item.identifier).toEqual(identifier);
        await item.destroy();
    });
    it("should find an existing item by identifier", async () => {
        let user = users[0];
        const identifier = chance.word();
        let item = await createItem({ identifier, userId: user.id });
        item = await lookupItemByIdentifier({ identifier, userId: user.id });
        expect(item.identifier).toEqual(identifier);
        await item.destroy();
    });
    it("should not find an existing item by identifier", async () => {
        let user = users[0];
        let item = await lookupItemByIdentifier({ identifier: "monkeys", userId: user.id });
        expect(item).toBeNull;
    });
    it("should be able to delete an item", async () => {
        let user = users[0];
        const identifier = chance.word();
        let item = await createItem({ identifier, userId: user.id });
        await deleteItem({ id: item.id });
        item = await lookupItemByIdentifier({ identifier, userId: user.id });
        expect(item).toBeNull;
    });
    it("should be able to link an item to a user", async () => {
        let user = users[0];
        const identifier = chance.word();
        let item = await createItem({ identifier, userId: user.id });

        let link = await linkItemToUser({ itemId: item.id, userId: user.id });
        // already linked
        expect(link[1]).toEqual(false);

        await item.destroy();
    });
    it("should be able to get own items", async () => {
        let user = users[0];
        const identifier = chance.word();
        let item = await createItem({ identifier, userId: user.id });

        // let link = await linkItemToUser({ itemId: item.id, userId: user.id });
        let items = await getItems({ userId: user.id });
        expect(items.count).toEqual(1);

        await item.destroy();
    });
    it("should find no items using pagination", async () => {
        let user = users[0];
        const identifier = chance.word();
        let item = await createItem({ identifier, userId: user.id });

        let link = await linkItemToUser({ itemId: item.id, userId: user.id });
        let items = await getItems({ userId: user.id, offset: 10 });
        expect(items.rows.length).toEqual(0);
        items = await getItems({ userId: user.id, limit: 0 });
        expect(items.rows.length).toEqual(0);

        await item.destroy();
    });
    it("should be able to list item resources in S3", async () => {
        let user = users[0];
        const identifier = chance.word();
        let item = await createItem({ identifier, userId: user.id });
        expect(item.identifier).toEqual(identifier);

        let { bucket } = await getS3Handle();
        await bucket.upload({ json: { some: "thing" }, target: `${identifier}/file.json` });

        let { resources } = await getItemResources({ identifier });
        expect(resources.length).toEqual(1);
        expect(resources[0].Key).toMatch(identifier);

        await bucket.removeObjects({ keys: [`${identifier}/file.json`] });
        await item.destroy();
    });
});
