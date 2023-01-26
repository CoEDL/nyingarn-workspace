require("regenerator-runtime");
import { createSession } from "../lib/session.js";
import Chance from "chance";
const chance = Chance();
import fetch from "cross-fetch";
import {
    getStoreHandle,
    TestSetup,
    headers,
    host,
    setupTestItem,
    setupTestCollection,
} from "../common/index.js";
import models from "../models/index.js";
import { ROCrate } from "ro-crate";

describe("Publish route tests", () => {
    let configuration, users, userEmail, adminEmail, bucket;
    let identifier, store;
    const tester = new TestSetup();

    beforeAll(async () => {
        ({ userEmail, adminEmail, configuration, bucket } = await tester.setupBeforeAll());
        users = await tester.setupUsers({ emails: [userEmail], adminEmails: [adminEmail] });
    });
    beforeEach(async () => {
        identifier = chance.word();
    });
    afterAll(async () => {
        await tester.purgeUsers({ users });
        await tester.teardownAfterAll(configuration);
    });

    it("should be able to publish an open item and get its publication status", async () => {
        let store = await getStoreHandle({
            id: identifier,
            type: "item",
        });

        //  setup as a normal user
        let user = users.filter((u) => !u.administrator)[0];
        await setupTestItem({ identifier, store, user });

        // connect as user
        let session = await createSession({ user });

        // publish the item
        let response = await fetch(`${host}/publish/items/${identifier}`, {
            method: "POST",
            headers: headers(session),
            body: JSON.stringify({
                user: { "@id": "https://some.id.com/person", name: "A user" },
                access: {
                    visibility: "open",
                },
            }),
        });
        expect(response.status).toEqual(200);

        let item = await models.item.findOne({ where: { identifier } });
        expect(item.publicationStatus).toEqual("awaitingReview");

        let crate = await store.getJSON({ target: "ro-crate-metadata.json" });
        crate = new ROCrate(crate, { array: true });
        expect(crate.rootDataset.depositor).toEqual([{ "@id": "https://some.id.com/person" }]);

        response = await fetch(`${host}/publish/items/${identifier}/status`, {
            method: "GET",
            headers: headers(session),
        });
        expect(response.status).toEqual(200);
        response = await response.json();
        expect(response).toEqual({
            status: "awaitingReview",
            visibility: "open",
            emails: [],
        });

        await models.item.destroy({ where: { identifier } });
        await store.removeObject();
    });
    it("should be able to publish a restricted item and get its publication status", async () => {
        let store = await getStoreHandle({
            id: identifier,
            type: "item",
        });

        //  setup as a normal user
        let user = users.filter((u) => !u.administrator)[0];
        await setupTestItem({ identifier, store, user });

        // connect as user
        let session = await createSession({ user });

        // publish the item
        let response = await fetch(`${host}/publish/items/${identifier}`, {
            method: "POST",
            headers: headers(session),
            body: JSON.stringify({
                user: { "@id": "https://some.id.com/person", name: "A user" },
                access: {
                    visibility: "restricted",
                    acl: ["user@example.com"],
                    narrative: "because",
                },
            }),
        });
        expect(response.status).toEqual(200);

        let item = await models.item.findOne({ where: { identifier } });
        expect(item.publicationStatus).toEqual("awaitingReview");

        let crate = await store.getJSON({ target: "ro-crate-metadata.json" });
        crate = new ROCrate(crate, { array: true });
        expect(crate.rootDataset.depositor).toEqual([{ "@id": "https://some.id.com/person" }]);

        response = await fetch(`${host}/publish/items/${identifier}/status`, {
            method: "GET",
            headers: headers(session),
        });
        expect(response.status).toEqual(200);
        response = await response.json();
        expect(response).toEqual({
            status: "awaitingReview",
            visibility: "restricted",
            emails: [user.email, "user@example.com"],
            narrative: "because",
        });

        await models.item.destroy({ where: { identifier } });
        await store.removeObject();
    });
    it("should be able to publish a collection and get its publication status", async () => {
        let store = await getStoreHandle({
            id: identifier,
            type: "collection",
        });

        //  setup as a normal user
        let user = users.filter((u) => !u.administrator)[0];
        await setupTestCollection({ identifier, store, user });

        // connect as user
        let session = await createSession({ user });

        // publish the item
        let response = await fetch(`${host}/publish/collections/${identifier}`, {
            method: "POST",
            headers: headers(session),
            body: JSON.stringify({
                user: { "@id": "https://some.id.com/person", name: "A user" },
                visibility: "open",
            }),
        });
        expect(response.status).toEqual(200);

        let collection = await models.collection.findOne({ where: { identifier } });
        expect(collection.publicationStatus).toEqual("awaitingReview");

        let crate = await store.getJSON({ target: "ro-crate-metadata.json" });
        crate = new ROCrate(crate, { array: true });
        expect(crate.rootDataset.depositor).toEqual([{ "@id": "https://some.id.com/person" }]);

        response = await fetch(`${host}/publish/collections/${identifier}/status`, {
            method: "GET",
            headers: headers(session),
        });
        expect(response.status).toEqual(200);
        response = await response.json();
        expect(response).toEqual({ status: "awaitingReview", visibility: "open" });

        await models.collection.destroy({ where: { identifier } });
        await store.removeObject();
    });
});
