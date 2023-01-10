require("regenerator-runtime");
import { createSession } from "../lib/session.js";
import Chance from "chance";
const chance = Chance();
import fetch from "cross-fetch";
<<<<<<< HEAD
import { getStoreHandle, TestSetup, headers, host } from "../common";

import lodashPkg from "lodash";
const { isArray } = lodashPkg;
=======
import {
    getStoreHandle,
    TestSetup,
    headers,
    host,
    setupTestItem,
    setupTestCollection,
} from "../common/index.js";
import models from "../models/index.js";
>>>>>>> implement-publish-flow

describe("Admin route tests", () => {
    let configuration, users, userEmail, adminEmail, bucket;
    let identifier, store;
    const tester = new TestSetup();

    beforeAll(async () => {
        ({ userEmail, adminEmail, configuration, bucket } = await tester.setupBeforeAll());
        users = await tester.setupUsers({ emails: [userEmail], adminEmails: [adminEmail] });
    });
    beforeEach(async () => {
        identifier = chance.word();
<<<<<<< HEAD
        store = await getStoreHandle({
            id: identifier,
            className: "collection",
        });
=======
>>>>>>> implement-publish-flow
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

    it("should be able to access the admin route endpoint", async () => {
        let user = users.filter((u) => u.administrator)[0];
        let session = await createSession({ user });
        let response = await fetch(`${host}/admin`, {
            method: "GET",
            headers: headers(session),
        });
        expect(response.status).toEqual(200);
    });
    it("should NOT be able to access the admin route endpoint", async () => {
        let user = users.filter((u) => !u.administrator)[0];
        let session = await createSession({ user });
        let response = await fetch(`${host}/admin`, {
            method: "GET",
            headers: headers(session),
        });
        expect(response.status).toEqual(403);
    });
<<<<<<< HEAD
    it("should be able to get a list of all items and collections", async () => {
        let user = users.filter((u) => u.administrator)[0];
        let session = await createSession({ user });
        let response = await fetch(`${host}/admin/entries`, {
=======
    it("an admin should be able to get a list of all items in the space", async () => {
        store = await getStoreHandle({
            id: identifier,
            className: "item",
        });

        //  setup as a normal user
        let user = users.filter((u) => !u.administrator)[0];
        await setupTestItem({ identifier, store, user });

        // setup and connect as an admin
        let adminUser = users.filter((u) => u.administrator)[0];
        let session = await createSession({ user: adminUser });

        let response = await fetch(`${host}/admin/entries/items`, {
            method: "GET",
            headers: headers(session),
        });
        response = await response.json();
        expect(response.items.length).toBeGreaterThanOrEqual(1);
        let item = response.items.filter((i) => i.identifier === identifier);
        expect(item.connected).toBeFalse;

        await models.item.destroy({ where: { identifier } });
        await store.deleteItem();
    });
    it("an admin should be able to get a list of all collections in the space", async () => {
        store = await getStoreHandle({
            id: identifier,
            className: "collection",
        });

        //  setup as a normal user
        let user = users.filter((u) => !u.administrator)[0];
        await setupTestCollection({ identifier, store, user });

        // setup and connect as an admin
        let adminUser = users.filter((u) => u.administrator)[0];
        let session = await createSession({ user: adminUser });

        let response = await fetch(`${host}/admin/entries/collections`, {
            method: "GET",
            headers: headers(session),
        });
        response = await response.json();
        expect(response.collections.length).toBeGreaterThanOrEqual(1);
        let collection = response.collections.filter((c) => c.identifier === identifier);
        expect(collection.connected).toBeFalse;

        await models.collection.destroy({ where: { identifier } });
        await store.deleteItem();
    });
    it("should be able to attach an item and a collection to the admin user", async () => {
        store = await getStoreHandle({
            id: identifier,
            className: "item",
        });

        //  setup as a normal user
        let user = users.filter((u) => !u.administrator)[0];
        await setupTestItem({ identifier, store, user });
        await setupTestCollection({ identifier, user });

        // connect as an admin
        let adminUser = users.filter((u) => u.administrator)[0];
        let session = await createSession({ user: adminUser });

        // connect to the item
        let response = await fetch(`${host}/admin/items/${identifier}/connect-user`, {
            method: "PUT",
            headers: headers(session),
            body: JSON.stringify({}),
        });
        expect(response.status).toEqual(200);

        // confirm we're connected to the item
        response = await fetch(`${host}/admin/entries/items`, {
            method: "GET",
            headers: headers(session),
        });
        response = await response.json();
        let item = response.items.filter((i) => i.identifier === identifier);
        expect(item.connected).toBeTrue;

        // connect to the collection
        response = await fetch(`${host}/admin/collections/${identifier}/connect-user`, {
            method: "PUT",
            headers: headers(session),
            body: JSON.stringify({}),
        });
        expect(response.status).toEqual(200);

        // confirm we're connected to the collection
        response = await fetch(`${host}/admin/entries/collections`, {
            method: "GET",
            headers: headers(session),
        });
        response = await response.json();
        let collection = response.collections.filter((c) => c.identifier === identifier);
        expect(collection.connected).toBeTrue;

        await models.item.destroy({ where: { identifier } });
        await store.deleteItem();

        await models.collection.destroy({ where: { identifier } });
        store = await getStoreHandle({
            id: identifier,
            className: "collection",
        });
        await store.deleteItem();
    });
    it("should be able to import items and collections from the storage into the DB", async () => {
        let storeItem = await getStoreHandle({
            id: identifier,
            className: "item",
        });
        await storeItem.createItem();

        let storeCollection = await getStoreHandle({
            id: identifier,
            className: "collection",
        });
        await storeCollection.createItem();

        // connect as an admin
        let adminUser = users.filter((u) => u.administrator)[0];
        let session = await createSession({ user: adminUser });

        // import items
        let response = await fetch(`${host}/admin/items/import`, {
            method: "GET",
            headers: headers(session),
        });
        expect(response.status).toEqual(200);

        // retrieve all items
        response = await fetch(`${host}/admin/entries/items`, {
            method: "GET",
            headers: headers(session),
        });
        response = await response.json();
        expect(response.items.length).toBeGreaterThanOrEqual(1);

        // import collections
        response = await fetch(`${host}/admin/collections/import`, {
            method: "GET",
            headers: headers(session),
        });
        expect(response.status).toEqual(200);

        // retrieve all collections
        response = await fetch(`${host}/admin/entries/collections`, {
            method: "GET",
            headers: headers(session),
        });
        response = await response.json();
        expect(response.collections.length).toBeGreaterThanOrEqual(1);

        await models.item.destroy({ where: { identifier } });
        await models.collection.destroy({ where: { identifier } });
        await storeItem.deleteItem();
        await storeCollection.deleteItem();
    });
    it("should be able to get items and collections awaiting review", async () => {
        let storeItem = await getStoreHandle({
            id: identifier,
            className: "item",
        });
        let storeCollection = await getStoreHandle({
            id: identifier,
            className: "collection",
        });

        //  setup as a normal user
        let user = users.filter((u) => !u.administrator)[0];
        await setupTestItem({ identifier, store: storeItem, user });
        await setupTestCollection({ identifier, user });

        let item = await models.item.findOne({ where: { identifier } });
        item.publicationStatus = "awaitingReview";
        await item.save();

        let collection = await models.collection.findOne({ where: { identifier } });
        collection.publicationStatus = "awaitingReview";
        await collection.save();

        // connect as an admin
        let adminUser = users.filter((u) => u.administrator)[0];
        let session = await createSession({ user: adminUser });

        // get items awaiting review
        let response = await fetch(`${host}/admin/items/awaiting-review`, {
>>>>>>> implement-publish-flow
            method: "GET",
            headers: headers(session),
        });
        expect(response.status).toEqual(200);
        response = await response.json();
<<<<<<< HEAD
        expect(isArray(response.items)).toBeTrue;
        expect(isArray(response.collections)).toBeTrue;
=======
        expect(response.items.length).toEqual(1);
        expect(response.items[0].identifier).toEqual(identifier);

        // get collections awaiting review
        response = await fetch(`${host}/admin/collections/awaiting-review`, {
            method: "GET",
            headers: headers(session),
        });
        expect(response.status).toEqual(200);
        response = await response.json();
        expect(response.collections.length).toEqual(1);
        expect(response.collections[0].identifier).toEqual(identifier);

        await models.item.destroy({ where: { identifier } });
        await models.collection.destroy({ where: { identifier } });
        await storeItem.deleteItem();
        await storeCollection.deleteItem();
    });
    it("should be able to deposit an item (mark it as published)", async () => {
        let storeItem = await getStoreHandle({
            id: identifier,
            className: "item",
        });

        //  setup as a normal user
        let user = users.filter((u) => !u.administrator)[0];
        await setupTestItem({ identifier, store: storeItem, user });

        // connect as an admin
        let adminUser = users.filter((u) => u.administrator)[0];
        let session = await createSession({ user: adminUser });

        // deposit the item
        let response = await fetch(`${host}/admin/items/${identifier}/deposit`, {
            method: "GET",
            headers: headers(session),
        });
        expect(response.status).toEqual(200);

        let item = await models.item.findOne({ where: { identifier } });
        expect(item.publicationStatus).toEqual("published");

        let crate = await storeItem.getJSON({ target: "ro-crate-metadata.json" });
        let licence = crate["@graph"].filter((e) => e["@id"] === "LICENCE")[0];
        expect(licence).toEqual({
            "@id": "LICENCE",
            "@type": ["File", "DataReuselicence"],
            name: "Open (subject to agreeing to PDSC access conditions)",
            access: {
                "@id": "http://purl.archive.org/language-data-commons/terms#OpenAccess",
            },
            authorizationWorkflow: {
                "@id": "http://purl.archive.org/language-data-commons/terms#AgreeToTerms",
            },
        });

        await models.item.destroy({ where: { identifier } });
        await storeItem.deleteItem();
    });
    it("should be able to mark an item as needing work", async () => {
        let storeItem = await getStoreHandle({
            id: identifier,
            className: "item",
        });

        //  setup as a normal user
        let user = users.filter((u) => !u.administrator)[0];
        await setupTestItem({ identifier, store: storeItem, user });

        // connect as an admin
        let adminUser = users.filter((u) => u.administrator)[0];
        let session = await createSession({ user: adminUser });

        // mark item as needing review
        let response = await fetch(`${host}/admin/items/${identifier}/needs-work`, {
            method: "PUT",
            headers: headers(session),
            body: JSON.stringify({}),
        });
        expect(response.status).toEqual(200);

        let item = await models.item.findOne({ where: { identifier } });
        expect(item.publicationStatus).toEqual("needsWork");

        await models.item.destroy({ where: { identifier } });
        await storeItem.deleteItem();
>>>>>>> implement-publish-flow
    });
});
