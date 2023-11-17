require("regenerator-runtime");
import { deleteCollection, createCollection } from "../lib/collection";
import { createSession } from "../lib/session";
const chance = require("chance").Chance();
import fetch from "node-fetch";
import { TestSetup, headers, host } from "../common/test-utils.js";
import { getStoreHandle } from "../common/getS3Handle";
import models from "../models";

describe("Collection management route tests", () => {
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
            type: "collection",
        });
    });
    afterEach(async () => {
        try {
            await store.removeObject();
        } catch (error) {}
    });
    afterAll(async () => {
        await tester.purgeUsers({ users });
        await tester.teardownAfterAll(configuration);
    });

    it("should be able to get own collections", async () => {
        let user = users.filter((u) => !u.administrator)[0];
        let session = await createSession({ user });

        // create a collection
        let collection = await createCollection({ identifier, userId: user.id });

        let response = await fetch(`${host}/collections`, {
            method: "GET",
            headers: headers(session),
        });
        expect(response.status).toEqual(200);
        let { total, collections } = await response.json();
        expect(total).toEqual(1);

        await deleteCollection({ id: collection.id });
    });
    it("should be able to get defined own collection", async () => {
        let user = users.filter((u) => !u.administrator)[0];
        let session = await createSession({ user });

        // create a collection
        let collection = await createCollection({ identifier, userId: user.id });

        let response = await fetch(`${host}/collections/${collection.identifier}`, {
            method: "GET",
            headers: headers(session),
        });
        expect(response.status).toEqual(200);
        expect((await response.json()).collection.identifier).toEqual(collection.identifier);
        await deleteCollection({ id: collection.id });
    });
    it("should fail trying to get a specific collection", async () => {
        let user = users.filter((u) => !u.administrator)[0];
        let session = await createSession({ user });

        let response = await fetch(`${host}/collections/${chance.word()}`, {
            method: "GET",
            headers: headers(session),
        });
        expect(response.status).toEqual(403);
    });
    it("should be able to create a new collection as an administrator", async () => {
        let user = users.filter((u) => u.administrator)[0];
        let session = await createSession({ user });

        const identifier = chance.word();
        let response = await fetch(`${host}/collections`, {
            method: "POST",
            headers: headers(session),
            body: JSON.stringify({
                identifier,
            }),
        });
        expect(response.status).toEqual(200);
        let { collection } = await response.json();
        expect(collection.identifier).toEqual(identifier);

        await deleteCollection({ id: collection.id });
    });
    it("should be able to create a new collection as a normal user", async () => {
        let user = users.filter((u) => !u.administrator)[0];
        let session = await createSession({ user });

        const identifier = chance.word();
        let response = await fetch(`${host}/collections`, {
            method: "POST",
            headers: headers(session),
            body: JSON.stringify({
                identifier,
            }),
        });
        expect(response.status).toEqual(200);
        let { collection } = await response.json();
        expect(collection.identifier).toEqual(identifier);

        await deleteCollection({ id: collection.id });
    });
    it("should be able to invite a user to collection", async () => {
        let user = users.filter((u) => !u.administrator)[0];
        let user2 = users.filter((u) => u.administrator)[0];
        let session = await createSession({ user });

        // create a collection
        let collection = await createCollection({ identifier, userId: user.id });

        // invite user 2 to item
        let response = await fetch(`${host}/collections/${identifier}/attach-user`, {
            method: "PUT",
            headers: headers(session),
            body: JSON.stringify({
                email: user2.email,
            }),
        });
        expect(response.status).toEqual(200);

        collection = await models.collection.findOne({
            where: { identifier },
            include: [{ model: models.user }],
        });
        expect(collection.users.length).toEqual(2);

        await deleteCollection({ id: collection.id });
        await models.log.destroy({ where: {} });
    });
    it("should be able to detach a user from a collection", async () => {
        let user = users.filter((u) => !u.administrator)[0];
        let user2 = users.filter((u) => u.administrator)[0];
        let session = await createSession({ user });

        // create a collection
        let collection = await createCollection({ identifier, userId: user.id });

        // invite user 2 to collection
        let response = await fetch(`${host}/collections/${identifier}/attach-user`, {
            method: "PUT",
            headers: headers(session),
            body: JSON.stringify({
                email: user2.email,
            }),
        });
        expect(response.status).toEqual(200);

        // connect as admin and detach the first user
        session = await createSession({ user: user2 });
        response = await fetch(`${host}/collections/${identifier}/detach-user`, {
            method: "PUT",
            headers: headers(session),
            body: JSON.stringify({
                userId: user.id,
            }),
        });
        expect(response.status).toEqual(200);

        collection = await models.collection.findOne({
            where: { identifier },
            include: [{ model: models.user }],
        });
        expect(collection.users.length).toEqual(1);

        await deleteCollection({ id: collection.id });
        await models.log.destroy({ where: {} });
    });
    it("should be able to get a list of collection users", async () => {
        let user = users.filter((u) => !u.administrator)[0];
        let user2 = users.filter((u) => u.administrator)[0];
        let session = await createSession({ user });

        // create a collection
        let collection = await createCollection({ identifier, userId: user.id });

        // invite user 2 to item
        let response = await fetch(`${host}/collections/${identifier}/attach-user`, {
            method: "PUT",
            headers: headers(session),
            body: JSON.stringify({
                email: user2.email,
            }),
        });
        expect(response.status).toEqual(200);

        // get list of users
        response = await fetch(`${host}/collections/${identifier}/users`, {
            method: "GET",
            headers: headers(session),
        });
        expect(response.status).toEqual(200);
        response = await response.json();
        expect(response.users.length).toEqual(2);

        await deleteCollection({ id: collection.id });
        await models.log.destroy({ where: {} });
    });
    it("should be able to delete own collection as a user", async () => {
        let user = users.filter((u) => !u.administrator)[0];
        let session = await createSession({ user });

        // create a collection
        let collection = await createCollection({ identifier, userId: user.id });

        let response = await fetch(`${host}/collections/${identifier}`, {
            method: "DELETE",
            headers: headers(session),
            body: JSON.stringify({ identifier }),
        });
        expect(response.status).toEqual(200);
    });
    it("should be able to toggle collection visibility", async () => {
        let user = users.filter((u) => !u.administrator)[0];
        let session = await createSession({ user });

        // create a collection
        let collection = await createCollection({ identifier, userId: user.id });

        // toggle visibility
        let response = await fetch(
            `${host}/collections/${collection.identifier}/toggle-visibility`,
            {
                method: "PUT",
                headers: headers(session),
                body: JSON.stringify({}),
            }
        );
        expect(response.status).toEqual(200);

        await deleteCollection({ id: collection.id });
    });
});
