require("regenerator-runtime");
import { deleteItem, createItem, updateResourceStatus } from "../lib/item";
import { createSession } from "../lib/session";
const chance = require("chance").Chance();
import fetch from "node-fetch";
import {
    getStoreHandle,
    TestSetup,
    setupTestItem,
    headers,
    host,
    resourceStatusFile,
} from "../common";
import models from "../models";

describe("Item management route tests", () => {
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
            await store.removeObject();
        } catch (error) {}
    });
    afterAll(async () => {
        await tester.purgeUsers({ users });
        await tester.teardownAfterAll(configuration);
    });
    it("should be able to get own items", async () => {
        let user = users.filter((u) => !u.administrator)[0];
        let session = await createSession({ user });

        // create an item
        let item = await createItem({ identifier, userId: user.id });

        // retrieve it
        let response = await fetch(`${host}/items`, {
            method: "GET",
            headers: headers(session),
        });
        expect(response.status).toEqual(200);
        let { total, items } = await response.json();
        expect(total).toEqual(1);

        await deleteItem({ id: item.id });
    });
    it("should be able to get defined own item", async () => {
        let user = users.filter((u) => !u.administrator)[0];
        let session = await createSession({ user });

        // create an item
        let item = await createItem({ identifier, userId: user.id });

        // retrieve it
        let response = await fetch(`${host}/items/${item.identifier}`, {
            method: "GET",
            headers: headers(session),
        });
        expect(response.status).toEqual(200);
        expect((await response.json()).item.identifier).toEqual(item.identifier);

        await deleteItem({ id: item.id });
    });
    it("should fail trying to get a specific item", async () => {
        let user = users.filter((u) => !u.administrator)[0];
        let session = await createSession({ user });

        let response = await fetch(`${host}/items/${chance.word()}`, {
            method: "GET",
            headers: headers(session),
        });
        expect(response.status).toEqual(403);
    });
    it("should be able to create a new item as an administrator", async () => {
        let user = users.filter((u) => u.administrator)[0];
        let session = await createSession({ user });

        let response = await fetch(`${host}/items`, {
            method: "POST",
            headers: headers(session),
            body: JSON.stringify({
                identifier,
            }),
        });
        expect(response.status).toEqual(200);
        let { item } = await response.json();
        expect(item.identifier).toEqual(identifier);

        await deleteItem({ id: item.id });
    });
    it("should be able to create a new item as a normal user", async () => {
        let user = users.filter((u) => !u.administrator)[0];
        let session = await createSession({ user });

        let response = await fetch(`${host}/items`, {
            method: "POST",
            headers: headers(session),
            body: JSON.stringify({
                identifier,
            }),
        });
        expect(response.status).toEqual(200);
        let { item } = await response.json();
        expect(item.identifier).toEqual(identifier);

        await deleteItem({ id: item.id });
    });
    it("should be able to invite a user to own item", async () => {
        let user = users.filter((u) => !u.administrator)[0];
        let user2 = users.filter((u) => u.administrator)[0];
        let session = await createSession({ user });

        // create an item
        let item = await createItem({ identifier, userId: user.id });

        // invite user 2 to item
        let response = await fetch(`${host}/items/${identifier}/attach-user`, {
            method: "PUT",
            headers: headers(session),
            body: JSON.stringify({
                email: user2.email,
            }),
        });
        expect(response.status).toEqual(200);

        item = await models.item.findOne({
            where: { identifier },
            include: [{ model: models.user }],
        });
        expect(item.get("users").length).toEqual(2);

        await deleteItem({ id: item.id });
        await models.log.destroy({ where: {} });
    });
    it("should be able to detach a user from an item", async () => {
        let user = users.filter((u) => !u.administrator)[0];
        let user2 = users.filter((u) => u.administrator)[0];
        let session = await createSession({ user });

        // create an item
        let item = await createItem({ identifier, userId: user.id });

        // invite user 2 to item
        let response = await fetch(`${host}/items/${identifier}/attach-user`, {
            method: "PUT",
            headers: headers(session),
            body: JSON.stringify({
                email: user2.email,
            }),
        });
        expect(response.status).toEqual(200);

        // connect as admin and detach the first user
        session = await createSession({ user });
        response = await fetch(`${host}/items/${identifier}/detach-user`, {
            method: "PUT",
            headers: headers(session),
            body: JSON.stringify({
                userId: user.id,
            }),
        });
        expect(response.status).toEqual(200);

        item = await models.item.findOne({
            where: { identifier },
            include: [{ model: models.user }],
        });
        expect(item.get("users").length).toEqual(1);

        // should fail to detach self as admin
        response = await fetch(`${host}/items/${identifier}/detach-user`, {
            method: "PUT",
            headers: headers(session),
            body: JSON.stringify({
                userId: user2.id,
            }),
        });
        expect(response.status).toEqual(403);

        await deleteItem({ id: item.id });
        await models.log.destroy({ where: {} });
    });
    it("should be able to get a list of item users", async () => {
        let user = users.filter((u) => !u.administrator)[0];
        let user2 = users.filter((u) => u.administrator)[0];
        let session = await createSession({ user });

        // create an item
        let item = await createItem({ identifier, userId: user.id });

        // invite user 2 to item
        let response = await fetch(`${host}/items/${identifier}/attach-user`, {
            method: "PUT",
            headers: headers(session),
            body: JSON.stringify({
                email: user2.email,
            }),
        });
        expect(response.status).toEqual(200);

        // get list of users
        response = await fetch(`${host}/items/${identifier}/users`, {
            method: "GET",
            headers: headers(session),
        });
        expect(response.status).toEqual(200);
        response = await response.json();
        expect(response.users.length).toEqual(2);

        await deleteItem({ id: item.id });
        await models.log.destroy({ where: {} });
    });
    it("should be able to delete own item as a user", async () => {
        let user = users.filter((u) => !u.administrator)[0];
        let session = await createSession({ user });

        // create an item
        let item = await createItem({ identifier, userId: user.id });

        let response = await fetch(`${host}/items/${identifier}`, {
            method: "DELETE",
            headers: headers(session),
            body: JSON.stringify({ identifier }),
        });
        expect(response.status).toEqual(200);

        let items = await models.item.findAll();
        expect(items.length).toEqual(0);

        let itemExists = await store.exists();
        expect(itemExists).toBe(false);
    });
    it("should succeed if the new item exists and is already associated to this user", async () => {
        let user = users.filter((u) => !u.administrator)[0];
        let session = await createSession({ user });

        // create an item
        let item = await createItem({ identifier, userId: user.id });

        let response = await fetch(`${host}/items`, {
            method: "POST",
            headers: headers(session),
            body: JSON.stringify({
                identifier,
            }),
        });
        expect(response.status).toEqual(200);

        await deleteItem({ id: item.id });
    });
    it("should be able to get item resources", async () => {
        let user = users.filter((u) => !u.administrator)[0];
        let session = await createSession({ user });
        let { item } = await setupTestItem({ identifier, store, user });

        let response = await fetch(`${host}/items/${identifier}/resources`, {
            method: "GET",
            headers: headers(session),
        });
        expect(response.status).toEqual(200);
        response = await response.json();
        expect(response.resources.length).toEqual(2);

        await deleteItem({ id: item.id });
    });
    it("should be able to get an item resource", async () => {
        let user = users.filter((u) => !u.administrator)[0];
        let session = await createSession({ user });
        let { item } = await setupTestItem({ identifier, store, user });

        let response = await fetch(`${host}/items/${identifier}/resources/${identifier}-01.json`, {
            method: "GET",
            headers: headers(session),
        });
        expect(response.status).toEqual(200);

        await bucket.removeObjects({ prefix: identifier });
        await deleteItem({ id: item.id });
    });
    it("should be able to get the status of a resource", async () => {
        let user = users.filter((u) => !u.administrator)[0];
        let session = await createSession({ user });
        let { item } = await setupTestItem({ identifier, store, user });

        let statusFile = await store.getJSON({ target: resourceStatusFile });
        statusFile = await updateResourceStatus({
            identifier,
            resource: `${identifier}-01`,
            statusFile,
        });
        await store.put({ target: resourceStatusFile, json: statusFile, registerFile: false });

        let response = await fetch(
            `${host}/items/${identifier}/resources/${identifier}-01/status`,
            {
                method: "GET",
                headers: headers(session),
            }
        );
        expect(response.status).toEqual(200);
        response = await response.json();
        expect(response.status).toEqual({
            complete: false,
            thumbnail: false,
            webformats: false,
            textract: false,
            tei: { exists: false, wellFormed: false },
        });

        await deleteItem({ id: item.id });
    });
    it("should be able to toggle the completed status of a resource", async () => {
        let user = users.filter((u) => !u.administrator)[0];
        let session = await createSession({ user });
        let { item } = await setupTestItem({ identifier, store, user });

        let response = await fetch(
            `${host}/items/${identifier}/resources/${identifier}-01/status?complete=true`,
            {
                method: "PUT",
                headers: headers(session),
                params: { complete: true },
                body: JSON.stringify({}),
            }
        );
        expect(response.status).toEqual(200);

        response = await fetch(`${host}/items/${identifier}/resources/${identifier}-01/status`, {
            method: "GET",
            headers: headers(session),
            params: { complete: true },
        });
        response = await response.json();
        expect(response.status).toEqual({ tei: {}, complete: true });

        response = await fetch(
            `${host}/items/${identifier}/resources/${identifier}-01/status?complete=false`,
            {
                method: "PUT",
                headers: headers(session),
                params: { complete: true },
                body: JSON.stringify({}),
            }
        );
        expect(response.status).toEqual(200);
        response = await fetch(`${host}/items/${identifier}/resources/${identifier}-01/status`, {
            method: "GET",
            headers: headers(session),
            params: { complete: true },
        });
        response = await response.json();
        expect(response.status).toEqual({ tei: {}, complete: false });

        await deleteItem({ id: item.id });
    });
    it("should be able to delete an item resource file", async () => {
        let user = users.filter((u) => !u.administrator)[0];
        let session = await createSession({ user });
        let { item } = await setupTestItem({ identifier, store, user });

        response = await fetch(`${host}/items/${identifier}/resources/${identifier}-01.json`, {
            method: "DELETE",
            headers: headers(session),
        });
        expect(response.status).toEqual(200);

        let response = await fetch(`${host}/items/${identifier}/resources/${identifier}-01/files`, {
            method: "GET",
            headers: headers(session),
        });
        let { files } = await response.json();
        expect(files.length).toBe(1);

        await deleteItem({ id: item.id });
    });
    it("should fail to get an item resource - not found", async () => {
        let user = users.filter((u) => !u.administrator)[0];
        let session = await createSession({ user });
        let { item } = await setupTestItem({ identifier, store, user });

        let response = await fetch(`${host}/items/${identifier}/resources/notfound.json`, {
            method: "GET",
            headers: headers(session),
        });
        expect(response.status).toEqual(404);

        await deleteItem({ id: item.id });
    });
    it("should be able to get a presigned link to an item resource", async () => {
        let user = users.filter((u) => !u.administrator)[0];
        let session = await createSession({ user });
        let { item } = await setupTestItem({ identifier, store, user });

        let response = await fetch(
            `${host}/items/${identifier}/resources/${identifier}-01.json/link`,
            {
                method: "GET",
                headers: headers(session),
            }
        );
        expect(response.status).toEqual(200);

        await deleteItem({ id: item.id });
    });
    it("should be able to get permission forms", async () => {
        let user = users.filter((u) => !u.administrator)[0];
        let session = await createSession({ user });
        let { item } = await setupTestItem({ identifier, store, user });
        await store.put({ json: {}, target: `${identifier}-rights-holder-permission.pdf` });
        await store.put({ json: {}, target: `${identifier}-language-authority-permission.pdf` });

        let response = await fetch(`${host}/items/${identifier}/permission-forms`, {
            method: "GET",
            headers: headers(session),
        });
        expect(response.status).toEqual(200);
        response = await response.json();
        expect(response.files.length).toEqual(2);

        await deleteItem({ id: item.id });
    });
    it("should be able to delete permission forms", async () => {
        let user = users.filter((u) => !u.administrator)[0];
        let session = await createSession({ user });
        let { item } = await setupTestItem({ identifier, store, user });
        await store.put({ json: {}, target: `${identifier}-rights-holder-permission.pdf` });
        await store.put({
            json: {},
            target: `${identifier}-language-authority-permission.pdf`,
        });

        let response = await fetch(
            `${host}/items/${identifier}/permission-forms/${identifier}-rights-holder-permission.pdf`,
            {
                method: "DELETE",
                headers: headers(session),
            }
        );
        expect(response.status).toEqual(200);

        response = await fetch(`${host}/items/${identifier}/permission-forms`, {
            method: "GET",
            headers: headers(session),
        });
        expect(response.status).toEqual(200);
        response = await response.json();
        expect(response.files.length).toEqual(1);
        expect(response.files[0].name).toMatch(/language-authority-permission\.pdf/);

        await deleteItem({ id: item.id });
    });
    it("should fail to get a presigned link to an item resource - not found", async () => {
        let user = users.filter((u) => !u.administrator)[0];
        let session = await createSession({ user });
        let { item } = await setupTestItem({ identifier, store, user });

        let response = await fetch(`${host}/items/${identifier}/resources/notfound.json/link`, {
            method: "GET",
            headers: headers(session),
        });
        expect(response.status).toEqual(404);

        await deleteItem({ id: item.id });
    });
});
