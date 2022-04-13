require("regenerator-runtime");
import { getS3Handle, setupTestItem } from "../common";
import models from "../models";
import {
    createCollection,
    getCollections,
    lookupCollectionByIdentifier,
    linkCollectionToUser,
    deleteCollection,
} from "./collection";
import { createItem } from "./item";
const chance = require("chance").Chance();
import { setupBeforeAll, setupBeforeEach, teardownAfterAll, teardownAfterEach } from "../common";

describe("Collection management tests", () => {
    let users, configuration, bucket;
    const userEmail = chance.email();
    const adminEmail = chance.email();
    beforeAll(async () => {
	configuration = await setupBeforeAll({ adminEmails: [adminEmail] });
	({ bucket } = await getS3Handle());
    });
    beforeEach(async () => {
	users = await setupBeforeEach({ emails: [userEmail, chance.email()] });
    });
    afterEach(async () => {
	await teardownAfterEach({ users });
    });
    afterAll(async () => {
	await teardownAfterAll(configuration);
    });
    it("should be able to create a new collection", async () => {
	let user = users[0];
	const identifier = chance.word();
	let collection = await createCollection({ identifier, userId: user.id });
	expect(collection.identifier).toEqual(identifier);
	let collections = await bucket.listObjects({ prefix: identifier });
	expect(collections.Contents.length).toEqual(1);
	expect(collections.Contents[0].Key).toEqual(`${identifier}/ro-crate-metadata.json`);
	await collection.destroy();
	await bucket.removeObjects({ prefix: identifier });
    });
    it("should fail to create a new collection - identifier conflict", async () => {
	let user = users[0];
	const identifier = chance.word();
	let collection = await createCollection({ identifier, userId: user.id });

	// conflicting collection identifier
	try {
	    collection = await createCollection({ identifier, userId: user.id });
	} catch (error) {
	    expect(error.message).toEqual(`A collection with that identifier already exists.`);
	}
	await collection.destroy();
	await bucket.removeObjects({ prefix: identifier });

	// conflicting item identifier
	let item = await createItem({ identifier, userId: user.id });
	try {
	    collection = await createCollection({ identifier, userId: user.id });
	} catch (error) {
	    expect(error.message).toEqual(`An item with that identifier already exists.`);
	}

	await item.destroy();
	await collection.destroy();
	await bucket.removeObjects({ prefix: identifier });
    });
    it("should be able to list my collections", async () => {
	let user = users[0];
	const identifier = chance.word();
	let collection = await createCollection({ identifier, userId: user.id });

	let collections = await getCollections({ userId: user.id });
	expect(collections.count).toEqual(1);

	await collection.destroy();
	await bucket.removeObjects({ prefix: identifier });
    });
    it("should be able to lookup a collection by identifier", async () => {
	let user = users[0];
	const identifier = chance.word();
	let collection = await createCollection({ identifier, userId: user.id });

	collection = await lookupCollectionByIdentifier({ identifier });
	expect(collection.identifier).toEqual(identifier);

	collection = await lookupCollectionByIdentifier({ identifier, userId: user.id });
	expect(collection.identifier).toEqual(identifier);

	await collection.destroy();
	await bucket.removeObjects({ prefix: identifier });
    });
    it("should be able to link a collection to another user", async () => {
	let user = users[0];
	const identifier = chance.word();
	let collection = await createCollection({ identifier, userId: user.id });

	await linkCollectionToUser({ collectionId: collection.id, userId: users[1].id });
	collection = await lookupCollectionByIdentifier({ identifier });
	expect(collection.users[0].email).toEqual(users[0].email);
	expect(collection.users[1].email).toEqual(users[1].email);

	await collection.destroy();
	await bucket.removeObjects({ prefix: identifier });
    });
    it("should be able to delete a collection", async () => {
	let user = users[0];
	const identifier = chance.word();
	let collection = await createCollection({ identifier, userId: user.id });
	await deleteCollection({ id: collection.id });

	collection = await lookupCollectionByIdentifier({ identifier });
	expect(collection).toBeNull;

	await bucket.removeObjects({ prefix: identifier });
    });
});
