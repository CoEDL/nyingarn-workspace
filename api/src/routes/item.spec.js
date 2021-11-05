require("regenerator-runtime");
import { createUser } from "../lib/user";
import { deleteItem } from "../lib/item";
import { createSession } from "../lib/session";
const chance = require("chance").Chance();
import fetch from "node-fetch";
import { getS3Handle } from "../common";
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
        expect(response.resources.length).toEqual(2);

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
