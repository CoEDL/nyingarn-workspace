require("regenerator-runtime");
import { deleteItem } from "../lib/item.js";
import Chance from "chance";
const chance = Chance();
import { TestSetup, setupTestItem, setupTestCollection } from "../common/test-utils.js";
import { getS3Handle, getStoreHandle } from "../common/getS3Handle.js";
import { loadConfiguration } from "../common/configuration.js";
import models from "../models/index.js";
import {
    getAdminItems,
    getAdminCollections,
    connectAdminToItem,
    connectAdminToCollection,
    importItemsFromStorageIntoTheDb,
    importCollectionsFromStorageIntoTheDb,
    getItemsAwaitingReview,
    getCollectionsAwaitingReview,
    publishObject,
    objectRequiresMoreWork,
    depositObjectIntoRepository,
    restoreObjectIntoWorkspace,
    deleteItemFromRepository,
} from "./admin.js";
import { Client } from "@elastic/elasticsearch";

describe("Admin management tests", () => {
    let configuration, users, userEmail, adminEmail, bucket;
    let identifier, store;
    const tester = new TestSetup();

    beforeAll(async () => {
        configuration = await loadConfiguration();
        ({ userEmail, adminEmail, configuration, bucket } = await tester.setupBeforeAll());
        users = await tester.setupUsers({ emails: [userEmail], adminEmails: [adminEmail] });
        let { bucket } = await getS3Handle();
        await bucket.removeObjects({ prefix: "nyingarn.net/workspace" });
    });
    beforeEach(async () => {
        identifier = chance.word();
    });
    afterAll(async () => {
        await tester.purgeUsers({ users });
        await tester.teardownAfterAll(configuration);
    });

    it("an admin should be able to get a list of all items in the space", async () => {
        store = await getStoreHandle({
            id: identifier,
            type: "item",
        });

        //  setup as a normal user
        let user = users.filter((u) => !u.administrator)[0];
        let adminUser = users.filter((u) => u.administrator)[0];
        await setupTestItem({ identifier, store, user });

        // ensure we can't use this method as a normal user
        try {
            await getAdminItems({ identifier, user });
        } catch (error) {
            expect(error.message).toEqual("User must be an admin");
        }

        // connect as admin
        let { items, total } = await getAdminItems({ user: adminUser });
        expect(total).toEqual(1);
        expect(items[0]).toMatchObject({ identifier, connected: false });

        await models.item.destroy({ where: { identifier } });
        await store.removeObject();
    });
    it("an admin should be able to get a list of all collections in the space", async () => {
        store = await getStoreHandle({
            id: identifier,
            type: "collection",
        });

        //  setup as a normal user
        let user = users.filter((u) => !u.administrator)[0];
        let adminUser = users.filter((u) => u.administrator)[0];
        await setupTestCollection({ identifier, store, user });

        // ensure we can't use this method as a normal user
        try {
            await getAdminCollections({ identifier, user });
        } catch (error) {
            expect(error.message).toEqual("User must be an admin");
        }

        // connect as admin
        let { collections, total } = await getAdminCollections({ user: adminUser });
        expect(total).toEqual(1);
        expect(collections[0]).toMatchObject({ identifier, connected: false });

        await models.collection.destroy({ where: { identifier } });
        await store.removeObject();
    });
    it("should be able to attach an item and a collection to the admin user", async () => {
        store = await getStoreHandle({
            id: identifier,
            type: "item",
        });

        //  setup as a normal user
        let user = users.filter((u) => !u.administrator)[0];
        let adminUser = users.filter((u) => u.administrator)[0];
        await setupTestItem({ identifier, store, user });
        await setupTestCollection({ identifier, user });

        // ensure we can't use these methods with a normal user
        try {
            await connectAdminToItem({ identifier, user });
        } catch (error) {
            expect(error.message).toEqual("User must be an admin");
        }
        try {
            await connectAdminToCollection({ identifier, user });
        } catch (error) {
            expect(error.message).toEqual("User must be an admin");
        }

        // connect to the item
        await connectAdminToItem({ identifier, user: adminUser });

        // confirm we're connected to the item
        let { items } = await getAdminItems({ user: adminUser });
        let item = items.filter((i) => i.identifier === identifier);
        expect(item.connected).toBeTrue;

        // connect to the collection
        await connectAdminToCollection({ identifier, user: adminUser });

        // confirm we're connected to the collection
        let { collections } = await getAdminCollections({ user: adminUser });
        let collection = collections.filter((c) => c.identifier === identifier);
        expect(collection.connected).toBeTrue;

        await models.item.destroy({ where: { identifier } });
        await store.removeObject();

        await models.collection.destroy({ where: { identifier } });
        store = await getStoreHandle({
            id: identifier,
            type: "collection",
        });
        await store.removeObject();
    });
    it("should be able to import items and collections from the storage into the DB", async () => {
        let storeItem = await getStoreHandle({
            id: identifier,
            type: "item",
        });
        await storeItem.createObject();

        let storeCollection = await getStoreHandle({
            id: identifier,
            type: "collection",
        });
        await storeCollection.createObject();

        let user = users.filter((u) => !u.administrator)[0];
        let adminUser = users.filter((u) => u.administrator)[0];
        const configuration = await loadConfiguration();

        try {
            await importItemsFromStorageIntoTheDb({ user, configuration });
        } catch (error) {
            expect(error.message).toEqual("User must be an admin");
        }
        try {
            await importCollectionsFromStorageIntoTheDb({ user, configuration });
        } catch (error) {
            expect(error.message).toEqual("User must be an admin");
        }

        // import items
        await importItemsFromStorageIntoTheDb({ user: adminUser, configuration });

        // retrieve all items
        let { items } = await getAdminItems({ user: adminUser });
        expect(items.filter((i) => i.identifier === identifier)[0]).toMatchObject({
            identifier,
            connected: false,
        });

        // import collections
        await importCollectionsFromStorageIntoTheDb({ user: adminUser, configuration });

        // retrieve all collections
        let { collections } = await getAdminCollections({ user: adminUser });
        expect(collections.filter((c) => c.identifier === identifier)[0]).toMatchObject({
            identifier,
            connected: false,
        });

        await models.item.destroy({ where: { identifier } });
        await models.collection.destroy({ where: { identifier } });
        await storeItem.removeObject();
        await storeCollection.removeObject();
    });
    it("should be able to get items and collections awaiting review", async () => {
        let storeItem = await getStoreHandle({
            id: identifier,
            type: "item",
        });
        let storeCollection = await getStoreHandle({
            id: identifier,
            type: "collection",
        });

        // setup
        let user = users.filter((u) => !u.administrator)[0];
        let adminUser = users.filter((u) => u.administrator)[0];
        await setupTestItem({ identifier, store: storeItem, user });
        await setupTestCollection({ identifier, user });

        let item = await models.item.findOne({ where: { identifier } });
        item.publicationStatus = "awaitingReview";
        await item.save();

        let collection = await models.collection.findOne({ where: { identifier } });
        collection.publicationStatus = "awaitingReview";
        await collection.save();

        try {
            await getItemsAwaitingReview({ user });
        } catch (error) {
            expect(error.message).toEqual("User must be an admin");
        }
        try {
            await getCollectionsAwaitingReview({ user });
        } catch (error) {
            expect(error.message).toEqual("User must be an admin");
        }

        // get items awaiting review
        let { items } = await getItemsAwaitingReview({ user: adminUser });
        expect(items.length).toEqual(1);
        expect(items[0].identifier).toEqual(identifier);

        // get collections awaiting review
        let { collections } = await getCollectionsAwaitingReview({ user: adminUser });
        expect(collections.length).toEqual(1);
        expect(collections[0].identifier).toEqual(identifier);

        await models.item.destroy({ where: { identifier } });
        await models.collection.destroy({ where: { identifier } });
        await storeItem.removeObject();
        await storeCollection.removeObject();
    });
    it("should be able to publish an openAccess object", async () => {
        let storeItem = await getStoreHandle({
            id: identifier,
            type: "item",
        });

        //  setup
        let user = users.filter((u) => !u.administrator)[0];
        let adminUser = users.filter((u) => u.administrator)[0];
        await setupTestItem({ identifier, store: storeItem, user });
        const configuration = await loadConfiguration();

        try {
            await publishObject({ user, type: "item", identifier, configuration });
        } catch (error) {
            expect(error.message).toEqual("User must be an admin");
        }
        // set up the expected metadata
        let item = await models.item.findOne({ where: { identifier } });
        expect(item.publicationStatus).toEqual("inProgress");

        item.publicationMetadata = {
            accessType: "open",
        };
        await item.save();

        // publish the item
        await publishObject({
            user: adminUser,
            type: "item",
            identifier,
            configuration,
        });

        await item.reload();
        expect(item.publicationStatus).toEqual("published");

        let crate = await storeItem.getJSON({ target: "ro-crate-metadata.json" });
        let licence = crate["@graph"].filter((e) => e["@id"] === "LICENCE.md")[0];
        expect(licence).toEqual({
            "@id": "LICENCE.md",
            "@type": ["File", "DataReuselicence"],
            name: "Open (subject to agreeing to Nyingarn access conditions)",
            access: {
                "@id": "http://purl.archive.org/language-data-commons/terms#OpenAccess",
            },
            authorizationWorkflow: {
                "@id": "http://purl.archive.org/language-data-commons/terms#AgreeToTerms",
            },
        });

        await models.item.destroy({ where: { identifier } });
        await storeItem.removeObject();
    });
    it("should be able to publish a restricted object", async () => {
        let storeItem = await getStoreHandle({
            id: identifier,
            type: "item",
        });

        //  setup
        let user = users.filter((u) => !u.administrator)[0];
        let adminUser = users.filter((u) => u.administrator)[0];
        await setupTestItem({ identifier, store: storeItem, user });
        const configuration = await loadConfiguration();

        try {
            await publishObject({ user, type: "item", identifier, configuration });
        } catch (error) {
            expect(error.message).toEqual("User must be an admin");
        }
        // set up the expected metadata
        let item = await models.item.findOne({ where: { identifier } });
        expect(item.publicationStatus).toEqual("inProgress");

        let now = new Date().toISOString();
        item.publicationMetadata = {
            accessType: "restricted",
            accessNarrative: {
                text: "closed",
                reviewDate: now,
            },
        };
        await item.save();

        // deposit the item
        await publishObject({
            user: adminUser,
            type: "item",
            identifier,
            configuration,
        });

        await item.reload();
        expect(item.publicationStatus).toEqual("published");

        let crate = await storeItem.getJSON({ target: "ro-crate-metadata.json" });
        let licence = crate["@graph"].filter((e) => e["@id"] === "LICENCE.md")[0];
        expect(licence).toMatchObject({
            "@id": "LICENCE.md",
            "@type": ["File", "DataReuselicence"],
            access: {
                "@id": "http://purl.archive.org/language-data-commons/terms#AuthorizedAccess",
            },
            authorizationWorkflow: [
                {
                    "@id": "http://purl.archive.org/language-data-commons/terms#AgreeToTerms",
                },
                {
                    "@id": "http://purl.archive.org/language-data-commons/terms#AccessControlList",
                },
            ],
            description: "closed",
            reviewDate: now,
            accessControlList: "file://.authorised-users.json",
        });

        await models.item.destroy({ where: { identifier } });
        await storeItem.removeObject();
    });
    it("should be able to mark an item as needing work", async () => {
        let storeItem = await getStoreHandle({
            id: identifier,
            type: "item",
        });

        //  setup
        let user = users.filter((u) => !u.administrator)[0];
        let adminUser = users.filter((u) => u.administrator)[0];
        await setupTestItem({ identifier, store: storeItem, user });

        try {
            await objectRequiresMoreWork({ type: "item", identifier });
        } catch (error) {
            expect(error.message).toEqual("User must be an admin");
        }

        // mark item as needing review
        await objectRequiresMoreWork({ type: "item", identifier });

        let item = await models.item.findOne({ where: { identifier } });
        expect(item.publicationStatus).toEqual("needsWork");

        await models.item.destroy({ where: { identifier } });
        await storeItem.removeObject();
    });
    it("should be able to deposit an item into the repository and clean up the workspace", async () => {
        let objectWorkspace = await getStoreHandle({ identifier, type: "item" });
        let objectRepository = await getStoreHandle({
            identifier,
            type: "item",
            location: "repository",
        });

        let user = users.filter((u) => !u.administrator)[0];
        let adminUser = users.filter((u) => u.administrator)[0];
        await setupTestItem({ identifier, store: objectWorkspace, user });
        const configuration = await loadConfiguration();

        // publish the item
        let item = await models.item.findOne({ where: { identifier } });
        item.publicationMetadata = {
            accessType: "open",
        };
        await item.save();
        await publishObject({
            user: adminUser,
            type: "item",
            identifier,
            configuration,
        });
        await item.reload();

        // deposit into the repo
        await depositObjectIntoRepository({ type: "item", identifier, configuration });

        let resources = await objectRepository.listResources();
        resources = resources.map((r) => r.Key);
        expect(resources.length).toEqual(10);

        // let objectExistsInWorkspace = await objectWorkspace.exists();
        // expect(objectExistsInWorkspace).toBeFalse;

        const client = new Client({
            node: configuration.api.services.elastic.host,
        });
        let document = await client.get({
            index: "manuscripts",
            id: `/item/${identifier}`,
        });
        expect(document._source).toMatchObject({
            name: "My Research Object Crate",
        });

        await objectWorkspace.removeObject();
        await objectRepository.removeObject();
        await deleteItem({ id: item.id });
    });
    it("should be able to deposit / restore items to / from repository", async () => {
        let objectWorkspace = await getStoreHandle({ identifier, type: "item" });
        let objectRepository = await getStoreHandle({
            identifier,
            type: "item",
            location: "repository",
        });

        let user = users.filter((u) => !u.administrator)[0];
        let adminUser = users.filter((u) => u.administrator)[0];
        await setupTestItem({ identifier, store: objectWorkspace, user });
        const configuration = await loadConfiguration();

        // publish the item
        let item = await models.item.findOne({ where: { identifier } });
        item.publicationMetadata = {
            accessType: "open",
        };
        await item.save();
        await publishObject({
            user: adminUser,
            type: "item",
            identifier,
            configuration,
        });
        await item.reload();

        // deposit into the repo
        await depositObjectIntoRepository({ type: "item", identifier, configuration });

        // restore the object from the repo back into the workspace
        // await restoreObjectIntoWorkspace({ type: "item", identifier });

        let objectExistsInWorkspace = await objectWorkspace.exists();
        expect(objectExistsInWorkspace).toBeTrue;
        let resources = await objectWorkspace.listResources();
        resources = resources.map((r) => r.Key);
        expect(resources.length).toEqual(10);

        // change the metadata file so it versions
        let crateFile = await objectWorkspace.getJSON({ target: "ro-crate-metadata.json" });
        crateFile["@graph"].push({ "@id": "something " });
        await objectWorkspace.put({ json: crateFile, target: "ro-crate-metadata.json" });

        resources = await objectWorkspace.listResources();
        resources = resources.map((r) => r.Key);
        expect(resources.length).toEqual(10);

        // deposit into the repo a second time and check metadata versioned
        await depositObjectIntoRepository({
            type: "item",
            identifier,
            version: { metadata: true },
            configuration,
        });

        resources = await objectRepository.listResources();
        resources = resources.map((r) => r.Key);
        expect(resources.length).toEqual(11);

        let crateFileVersions = await objectRepository.listFileVersions({
            target: "ro-crate-metadata.json ",
        });
        expect(crateFileVersions.length).toEqual(2);

        await objectWorkspace.removeObject();
        await objectRepository.removeObject();
        await deleteItem({ id: item.id });
    });
    it("should be able to delete an item from the repository", async () => {
        let objectWorkspace = await getStoreHandle({ identifier, type: "item" });
        let objectRepository = await getStoreHandle({
            identifier,
            type: "item",
            location: "repository",
        });

        let user = users.filter((u) => !u.administrator)[0];
        let adminUser = users.filter((u) => u.administrator)[0];
        await setupTestItem({ identifier, store: objectWorkspace, user });
        const configuration = await loadConfiguration();

        // publish the item
        let item = await models.item.findOne({ where: { identifier } });
        item.publicationMetadata = {
            accessType: "open",
        };
        await item.save();
        await publishObject({
            user: adminUser,
            type: "item",
            identifier,
            configuration,
        });
        await item.reload();

        // deposit into the repo
        await depositObjectIntoRepository({ type: "item", identifier, configuration });

        // delete the item from the repository
        await deleteItemFromRepository({ type: "item", identifier, configuration });

        let exists = await objectRepository.exists();
        expect(exists).toEqual(false);

        let repoitem = await models.repoitem.findOne({ where: { identifier } });
        expect(repoitem).toEqual(null);

        await objectWorkspace.removeObject();
        await objectRepository.removeObject();
        await deleteItem({ id: item.id });
    });
});
