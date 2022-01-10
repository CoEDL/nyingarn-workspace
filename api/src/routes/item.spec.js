require("regenerator-runtime");
import { createUser } from "../lib/user";
import { deleteItem } from "../lib/item";
import { createSession } from "../lib/session";
const chance = require("chance").Chance();
import fetch from "node-fetch";
import { getS3Handle } from "../common";
import models from "../models";
import {
    host,
    setupBeforeAll,
    setupBeforeEach,
    teardownAfterAll,
    teardownAfterEach,
} from "../common";

describe("Item management route tests", () => {
    let configuration, users, bucket;
    const userEmail = chance.email();
    const adminEmail = chance.email();
    beforeAll(async () => {
        configuration = await setupBeforeAll({ adminEmails: [adminEmail] });
        ({ bucket } = await getS3Handle());
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
    it("should be able to create a new item as an administrator", async () => {
        let user = {
            email: adminEmail,
            givenName: chance.word(),
            familyName: chance.word(),
            provider: chance.word(),
        };
        user = await createUser(user);

        let session = await createSession({ user });

        const identifier = chance.word();
        let response = await fetch(`${host}/items`, {
            method: "POST",
            headers: {
                authorization: `Bearer ${session.token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                identifier,
            }),
        });
        expect(response.status).toEqual(200);
        let { item } = await response.json();
        expect(item.identifier).toEqual(identifier);

        await deleteItem({ id: item.id });
        await user.destroy();
        await bucket.removeObjects({ prefix: identifier });
    });
    it("should be able to create a new item as a normal user", async () => {
        let user = {
            email: userEmail,
            givenName: chance.word(),
            familyName: chance.word(),
            provider: chance.word(),
        };
        user = await createUser(user);

        let session = await createSession({ user });

        const identifier = chance.word();
        let response = await fetch(`${host}/items`, {
            method: "POST",
            headers: {
                authorization: `Bearer ${session.token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                identifier,
            }),
        });
        expect(response.status).toEqual(200);
        let { item } = await response.json();
        expect(item.identifier).toEqual(identifier);

        await deleteItem({ id: item.id });
        await bucket.removeObjects({ prefix: identifier });
    });
    it("should be able to delete own item as a user", async () => {
        let user = {
            email: userEmail,
            givenName: chance.word(),
            familyName: chance.word(),
            provider: chance.word(),
        };
        user = await createUser(user);

        let session = await createSession({ user });

        const identifier = chance.word();
        let response = await fetch(`${host}/items`, {
            method: "POST",
            headers: {
                authorization: `Bearer ${session.token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                identifier,
            }),
        });
        expect(response.status).toEqual(200);

        response = await fetch(`${host}/items/${identifier}`, {
            method: "DELETE",
            headers: {
                authorization: `Bearer ${session.token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ identifier }),
        });
        expect(response.status).toEqual(200);
    });
    it("should succeed if the new item exists and is already associated to this user", async () => {
        let user = {
            email: userEmail,
            givenName: chance.word(),
            familyName: chance.word(),
            provider: chance.word(),
        };
        user = await createUser(user);

        let session = await createSession({ user });

        const identifier = chance.word();
        let response = await fetch(`${host}/items`, {
            method: "POST",
            headers: {
                authorization: `Bearer ${session.token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                identifier,
            }),
        });
        expect(response.status).toEqual(200);
        let { item } = await response.json();

        response = await fetch(`${host}/items`, {
            method: "POST",
            headers: {
                authorization: `Bearer ${session.token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                identifier,
            }),
        });
        expect(response.status).toEqual(200);

        await deleteItem({ id: item.id });
        await bucket.removeObjects({ prefix: identifier });
    });
    it("should be able to get own items", async () => {
        let user = {
            email: userEmail,
            givenName: chance.word(),
            familyName: chance.word(),
            provider: chance.word(),
        };
        user = await createUser(user);

        let session = await createSession({ user });

        const identifier = chance.word();
        let response = await fetch(`${host}/items`, {
            method: "POST",
            headers: {
                authorization: `Bearer ${session.token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                identifier,
            }),
        });
        expect(response.status).toEqual(200);
        let { item } = await response.json();

        response = await fetch(`${host}/items`, {
            method: "GET",
            headers: {
                authorization: `Bearer ${session.token}`,
                "Content-Type": "application/json",
            },
        });
        expect(response.status).toEqual(200);
        let { total, items } = await response.json();
        expect(total).toEqual(1);

        await deleteItem({ id: item.id });
        await bucket.removeObjects({ prefix: identifier });
    });
    it("should be able to get item resources", async () => {
        let { user, identifier, item, session } = await setupTestItem({ email: userEmail });

        let response = await fetch(`${host}/items/${identifier}/resources`, {
            method: "GET",
            headers: {
                authorization: `Bearer ${session.token}`,
                "Content-Type": "application/json",
            },
        });
        expect(response.status).toEqual(200);
        response = await response.json();
        expect(response.resources.length).toEqual(1);

        await bucket.removeObjects({ prefix: identifier });
        await deleteItem({ id: item.id });
    });
    it("should be able to get an item resource", async () => {
        let { user, identifier, item, session } = await setupTestItem({ email: userEmail });

        let response = await fetch(`${host}/items/${identifier}/resources/file.json`, {
            method: "GET",
            headers: {
                authorization: `Bearer ${session.token}`,
                "Content-Type": "application/json",
            },
        });
        expect(response.status).toEqual(200);

        await bucket.removeObjects({ prefix: identifier });
        await deleteItem({ id: item.id });
    });
    it("should be able to delete an item resource", async () => {
        let { user, identifier, item, session } = await setupTestItem({ email: userEmail });

        let response = await fetch(`${host}/items/${identifier}/resources/file.json`, {
            method: "GET",
            headers: {
                authorization: `Bearer ${session.token}`,
                "Content-Type": "application/json",
            },
        });
        expect(response.status).toEqual(200);

        response = await fetch(`${host}/items/${identifier}/resources`, {
            method: "GET",
            headers: {
                authorization: `Bearer ${session.token}`,
                "Content-Type": "application/json",
            },
        });
        let { resources } = await response.json();
        expect(resources.length).toBe(1);

        response = await fetch(`${host}/items/${identifier}/resources/file.json`, {
            method: "DELETE",
            headers: {
                authorization: `Bearer ${session.token}`,
                "Content-Type": "application/json",
            },
        });
        expect(response.status).toEqual(200);

        response = await fetch(`${host}/items/${identifier}/resources`, {
            method: "GET",
            headers: {
                authorization: `Bearer ${session.token}`,
                "Content-Type": "application/json",
            },
        });
        ({ resources } = await response.json());
        expect(resources.length).toBe(0);

        // await bucket.removeObjects({ prefix: identifier });
        await deleteItem({ id: item.id });
    });
    it("should fail to get an item resource - not found", async () => {
        let { user, identifier, item, session } = await setupTestItem({ email: userEmail });

        let response = await fetch(`${host}/items/${identifier}/resources/notfound.json`, {
            method: "GET",
            headers: {
                authorization: `Bearer ${session.token}`,
                "Content-Type": "application/json",
            },
        });
        expect(response.status).toEqual(404);

        await bucket.removeObjects({ prefix: identifier });
        await deleteItem({ id: item.id });
    });
    it("should be able to get a presigned link to an item resource", async () => {
        let { user, identifier, item, session } = await setupTestItem({ email: userEmail });

        let response = await fetch(`${host}/items/${identifier}/resources/file.json/link`, {
            method: "GET",
            headers: {
                authorization: `Bearer ${session.token}`,
                "Content-Type": "application/json",
            },
        });
        expect(response.status).toEqual(200);

        await bucket.removeObjects({ prefix: identifier });
        await deleteItem({ id: item.id });
    });
    it("should fail to get a presigned link to an item resource - not found", async () => {
        let { user, identifier, item, session } = await setupTestItem({ email: userEmail });

        let response = await fetch(`${host}/items/${identifier}/resources/notfound.json/link`, {
            method: "GET",
            headers: {
                authorization: `Bearer ${session.token}`,
                "Content-Type": "application/json",
            },
        });
        expect(response.status).toEqual(404);

        await bucket.removeObjects({ prefix: identifier });
        await deleteItem({ id: item.id });
    });
    it("should be able to get a list of all items in the space", async () => {
        let identifiers = [];
        let items = [];
        let { identifier, item, session } = await setupTestItem({ email: userEmail });
        identifiers.push(identifier);
        items.push(item);
        ({ identifier, item, session } = await setupTestItem({ email: adminEmail }));
        identifiers.push(identifier);
        items.push(item);

        let response = await fetch(`${host}/admin/items`, {
            method: "GET",
            headers: {
                authorization: `Bearer ${session.token}`,
                "Content-Type": "application/json",
            },
        });
        response = await response.json();
        expect(response.items.length).toBeGreaterThanOrEqual(2);

        for (let identifier of identifiers) {
            await bucket.removeObjects({ prefix: identifier });
        }
        await models.user.destroy({ where: {} });
        await models.item.destroy({ where: {} });
    });
    it("should be able to attach an item to the admin user", async () => {
        let identifiers = [];
        let items = [];
        let { identifier, item, session } = await setupTestItem({ email: userEmail });
        identifiers.push(identifier);
        items.push(item);
        ({ identifier, item, session } = await setupTestItem({ email: adminEmail }));
        identifiers.push(identifier);
        items.push(item);

        let response = await fetch(`${host}/admin/items/${identifiers[0]}/connect-user`, {
            method: "PUT",
            headers: {
                authorization: `Bearer ${session.token}`,
                "Content-Type": "application/json",
            },
        });
        expect(response.status).toEqual(200);

        for (let identifier of identifiers) {
            await bucket.removeObjects({ prefix: identifier });
        }
        await models.user.destroy({ where: {} });
        await models.item.destroy({ where: {} });
    });
});

async function setupTestItem({ email }) {
    let user = {
        email,
        givenName: chance.word(),
        familyName: chance.word(),
        provider: chance.word(),
    };
    user = await createUser(user);

    let session = await createSession({ user });

    const identifier = chance.word();
    let response = await fetch(`${host}/items`, {
        method: "POST",
        headers: {
            authorization: `Bearer ${session.token}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            identifier,
        }),
    });
    expect(response.status).toEqual(200);
    let { item } = await response.json();

    let { bucket } = await getS3Handle();
    await bucket.upload({ json: { some: "thing" }, target: `${identifier}/file.json` });
    return { user, identifier, item, session };
}
