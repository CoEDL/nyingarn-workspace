require("regenerator-runtime");
const { createUser } = require("../lib/user");
const { deleteItem } = require("../lib/item");
const { createSession } = require("../lib/session");
const chance = require("chance").Chance();
const fetch = require("node-fetch");
import { getS3Handle } from "../common";
const host = `http://localhost:8080`;

describe("Item management route tests", () => {
    beforeAll(async () => {});
    afterAll(async () => {});
    it("should be able to create a new item", async () => {
        let user = {
            email: chance.email(),
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

        await user.destroy();
        await deleteItem({ id: item.id });
    });
    it("should succeed if the new item exists and is already associated to this user", async () => {
        let user = {
            email: chance.email(),
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

        await user.destroy();
        await deleteItem({ id: item.id });
    });
    it("should be able to get own items", async () => {
        let user = {
            email: chance.email(),
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

        await user.destroy();
        await deleteItem({ id: item.id });
    });
    it("should be able to get item resources", async () => {
        let user = {
            email: chance.email(),
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

        response = await fetch(`${host}/items/${item.identifier}/resources`, {
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
        await user.destroy();
        await deleteItem({ id: item.id });
    });
});
