require("regenerator-runtime");
import { createUser } from "../lib/user";
import { deleteItem, createItem } from "../lib/item";
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
    setupTestItem,
} from "../common";

describe("Item management route tests", () => {
    let configuration, users, bucket, session, user;
    const userEmail = chance.email();
    const adminEmail = chance.email();
    beforeAll(async () => {
        configuration = await setupBeforeAll({ adminEmails: [adminEmail] });
        ({ bucket } = await getS3Handle());
    });
    beforeEach(async () => {
        users = await setupBeforeEach({ emails: [userEmail], adminEmails: [adminEmail] });
        session = await createSession({ user: users[0] });
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
    it("should be able to invite a user to own item", async () => {
        let user = {
            email: userEmail,
            givenName: chance.word(),
            familyName: chance.word(),
            provider: chance.word(),
        };
        user = await createUser(user);
        let user2 = {
            email: adminEmail,
            givenName: chance.word(),
            familyName: chance.word(),
            provider: chance.word(),
        };
        user2 = await createUser(user2);

        let session = await createSession({ user });

        // create an item
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

        // invite user 2 to item
        response = await fetch(`${host}/items/${identifier}/attach-user`, {
            method: "PUT",
            headers: {
                authorization: `Bearer ${session.token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                email: user2.email,
            }),
        });
        expect(response.status).toEqual(200);

        let links = await models.item_user.findAll();
        expect(links.length).toEqual(2);

        await deleteItem({ id: item.id });
        await user.destroy();
        await user2.destroy();
        await models.log.destroy({ where: {} });
    });
    it("should be able to detach a user from an item", async () => {
        let user = {
            email: userEmail,
            givenName: chance.word(),
            familyName: chance.word(),
            provider: chance.word(),
        };
        user = await createUser(user);
        let user2 = {
            email: adminEmail,
            givenName: chance.word(),
            familyName: chance.word(),
            provider: chance.word(),
        };
        user2 = await createUser(user2);

        let session = await createSession({ user });

        // create an item
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

        // invite user 2 to item
        response = await fetch(`${host}/items/${identifier}/attach-user`, {
            method: "PUT",
            headers: {
                authorization: `Bearer ${session.token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                email: user2.email,
            }),
        });
        expect(response.status).toEqual(200);

        // connect as admin and detach the first user
        session = await createSession({ user });
        response = await fetch(`${host}/items/${identifier}/detach-user`, {
            method: "PUT",
            headers: {
                authorization: `Bearer ${session.token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                userId: user.id,
            }),
        });
        expect(response.status).toEqual(200);

        let links = await models.item_user.findAll();
        expect(links.length).toEqual(1);

        // should fail to detach self as admin
        response = await fetch(`${host}/items/${identifier}/detach-user`, {
            method: "PUT",
            headers: {
                authorization: `Bearer ${session.token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                userId: user2.id,
            }),
        });
        expect(response.status).toEqual(403);

        await deleteItem({ id: item.id });
        await user.destroy();
        await user2.destroy();
        await models.log.destroy({ where: {} });
    });
    it("should be able to get a list of item users", async () => {
        let user = {
            email: userEmail,
            givenName: chance.word(),
            familyName: chance.word(),
            provider: chance.word(),
        };
        user = await createUser(user);
        let user2 = {
            email: adminEmail,
            givenName: chance.word(),
            familyName: chance.word(),
            provider: chance.word(),
        };
        user2 = await createUser(user2);

        let session = await createSession({ user });

        // create an item
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

        // invite user 2 to item
        response = await fetch(`${host}/items/${identifier}/attach-user`, {
            method: "PUT",
            headers: {
                authorization: `Bearer ${session.token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                email: user2.email,
            }),
        });
        expect(response.status).toEqual(200);

        // get list of users
        response = await fetch(`${host}/items/${identifier}/users`, {
            method: "GET",
            headers: {
                authorization: `Bearer ${session.token}`,
                "Content-Type": "application/json",
            },
        });
        expect(response.status).toEqual(200);
        let { users } = await response.json();
        expect(users.length).toEqual(2);

        await deleteItem({ id: item.id });
        await user.destroy();
        await user2.destroy();
        await models.log.destroy({ where: {} });
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
        let { identifier, item } = await setupTestItem({ user: users[0], bucket });

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
        let { identifier, item } = await setupTestItem({ user: users[0], bucket });

        let response = await fetch(`${host}/items/${identifier}/resources/${identifier}-01.json`, {
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
    it("should be able to delete an item resource file", async () => {
        let { identifier, item } = await setupTestItem({ user: users[0], bucket });

        response = await fetch(`${host}/items/${identifier}/resources/${identifier}-01.json`, {
            method: "DELETE",
            headers: {
                authorization: `Bearer ${session.token}`,
                "Content-Type": "application/json",
            },
        });
        expect(response.status).toEqual(200);

        let response = await fetch(`${host}/items/${identifier}/resources/${identifier}-01/files`, {
            method: "GET",
            headers: {
                authorization: `Bearer ${session.token}`,
                "Content-Type": "application/json",
            },
        });
        let { files } = await response.json();
        expect(files.length).toBe(1);

        await bucket.removeObjects({ prefix: identifier });
        await deleteItem({ id: item.id });
    });
    it("should fail to get an item resource - not found", async () => {
        let { identifier, item } = await setupTestItem({ user: users[0], bucket });

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
        let { identifier, item } = await setupTestItem({ user: users[0], bucket });

        let response = await fetch(
            `${host}/items/${identifier}/resources/${identifier}-01.json/link`,
            {
                method: "GET",
                headers: {
                    authorization: `Bearer ${session.token}`,
                    "Content-Type": "application/json",
                },
            }
        );
        expect(response.status).toEqual(200);

        await bucket.removeObjects({ prefix: identifier });
        await deleteItem({ id: item.id });
    });
    it("should fail to get a presigned link to an item resource - not found", async () => {
        let { identifier, item } = await setupTestItem({ user: users[0], bucket });

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
        //  setup as a normal user
        let { identifier, item } = await setupTestItem({ user: users[0], bucket });

        identifiers.push(identifier);
        items.push(item);

        // setup and connect as an admin
        // ({ identifier, item } = await setupTestItem({ user: users[1], bucket }));
        session = await createSession({ user: users[1] });

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
        //  setup as a normal user
        let { identifier, item } = await setupTestItem({ user: users[0], bucket });
        identifiers.push(identifier);
        items.push(item);

        // connect as an admin
        session = await createSession({ user: users[1] });

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
