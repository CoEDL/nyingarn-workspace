require("regenerator-runtime");
import { getS3Handle } from "../common";

const {
    createItem,
    lookupItemByIdentifier,
    deleteItem,
    linkItemToUser,
    getItems,
    getItemResources,
} = require("./item");
const { createUser } = require("./user");
const chance = require("chance").Chance();

describe("Item management tests", () => {
    let user;
    beforeEach(async () => {
        user = await createUser({
            email: chance.email(),
            givenName: chance.word(),
            familyName: chance.word(),
            provider: chance.word(),
        });
    });
    afterEach(async () => {
        await user.destroy();
    });
    it("should be able to create a new item", async () => {
        const identifier = chance.word();
        let item = await createItem({ identifier, userId: user.id });
        expect(item.identifier).toEqual(identifier);
        await item.destroy();
    });
    it("should find an existing item by identifier", async () => {
        const identifier = chance.word();
        let item = await createItem({ identifier, userId: user.id });
        item = await lookupItemByIdentifier({ identifier, userId: user.id });
        expect(item.identifier).toEqual(identifier);
        await item.destroy();
    });
    it("should not find an existing item by identifier", async () => {
        let item = await lookupItemByIdentifier({ identifier: "monkeys", userId: user.id });
        expect(item).toBeNull;
    });
    it("should be able to delete an item", async () => {
        const identifier = chance.word();
        let item = await createItem({ identifier, userId: user.id });
        await deleteItem({ id: item.id });
        item = await lookupItemByIdentifier({ identifier, userId: user.id });
        expect(item).toBeNull;
    });
    it("should be able to link an item to a user", async () => {
        const identifier = chance.word();
        let item = await createItem({ identifier, userId: user.id });

        let link = await linkItemToUser({ itemId: item.id, userId: user.id });
        // already linked
        expect(link[1]).toEqual(false);

        await item.destroy();
    });
    it("should be able to get own items", async () => {
        const identifier = chance.word();
        let item = await createItem({ identifier, userId: user.id });

        // let link = await linkItemToUser({ itemId: item.id, userId: user.id });
        let items = await getItems({ userId: user.id });
        expect(items.count).toEqual(1);

        await item.destroy();
    });
    it("should find no items using pagination", async () => {
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
