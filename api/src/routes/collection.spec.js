require("regenerator-runtime");
import { deleteCollection, createCollection } from "../lib/collection";
import { deleteItem, createItem } from "../lib/item";
import { createSession } from "../lib/session";
const chance = require("chance").Chance();
import fetch from "node-fetch";
import { TestSetup, headers, host } from "../common/test-utils.js";
import { getStoreHandle } from "../common/getS3Handle";
import models from "../models";

describe("Collection management route tests", () => {
    let configuration, users, userEmail, adminEmail, bucket;
    let identifier;
    const tester = new TestSetup();
    async function removeStore({ id, type }) {
        let store = await getStoreHandle({ id, type });
        try {
            await store.removeObject();
        } catch (error) {}
    }

    beforeAll(async () => {
        ({ userEmail, adminEmail, configuration, bucket } = await tester.setupBeforeAll());
        users = await tester.setupUsers({
            emails: [userEmail, chance.email()],
            adminEmails: [adminEmail],
        });
    });
    beforeEach(async () => {
        identifier = chance.word();
    });
    afterEach(async () => {
        await removeStore({ id: identifier, type: "collection" });
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
    describe("inviting a user to a collection and its items", () => {
        let inviter, invitee, admin, collection, items;

        async function invite({ session, email, includeItems }) {
            let response = await fetch(`${host}/collections/${identifier}/attach-user`, {
                method: "PUT",
                headers: headers(session),
                body: JSON.stringify({ email, includeItems }),
            });
            expect(response.status).toEqual(200);
            return await response.json();
        }
        async function itemIdentifiersAccessibleTo(user) {
            let accessible = await user.getItems();
            return accessible.map((i) => i.identifier).sort();
        }
        async function createItemFor({ userId }) {
            let item = await createItem({ identifier: chance.word(), userId });
            items.push(item);
            return item;
        }

        beforeEach(async () => {
            [inviter, invitee] = users.filter((u) => !u.administrator);
            admin = users.filter((u) => u.administrator)[0];
            collection = await createCollection({ identifier, userId: inviter.id });
            items = [];
        });
        afterEach(async () => {
            for (let item of items) {
                await deleteItem({ id: item.id });
                await removeStore({ id: item.identifier, type: "item" });
            }
            await deleteCollection({ id: collection.id });
            await models.log.destroy({ where: {} });
        });

        it("grants access to the collection only when includeItems is not set", async () => {
            let item = await createItemFor({ userId: inviter.id });
            await collection.addItem(item);

            let result = await invite({
                session: await createSession({ user: inviter }),
                email: invitee.email,
            });
            expect(result).toEqual({ granted: [], skipped: [] });
            expect((await collection.getUsers()).map((u) => u.id)).toContain(invitee.id);
            expect(await itemIdentifiersAccessibleTo(invitee)).toEqual([]);
        });
        it("grants access to every direct item the inviter can access", async () => {
            let item1 = await createItemFor({ userId: inviter.id });
            let item2 = await createItemFor({ userId: inviter.id });
            await collection.addItems([item1, item2]);

            let result = await invite({
                session: await createSession({ user: inviter }),
                email: invitee.email,
                includeItems: true,
            });
            expect(result.granted.sort()).toEqual([item1.identifier, item2.identifier].sort());
            expect(result.skipped).toEqual([]);
            expect(await itemIdentifiersAccessibleTo(invitee)).toEqual(
                [item1.identifier, item2.identifier].sort()
            );

            for (let item of [item1, item2]) {
                let text = `User '${inviter.email}' invited '${invitee.email}' to '${item.identifier}'`;
                let logs = await models.log.findAll({ where: { text } });
                expect(logs.length).toEqual(1);
            }
        });
        it("skips items the inviter cannot access", async () => {
            let held = await createItemFor({ userId: inviter.id });
            let notHeld = await createItemFor({ userId: admin.id });
            await collection.addItems([held, notHeld]);

            let result = await invite({
                session: await createSession({ user: inviter }),
                email: invitee.email,
                includeItems: true,
            });
            expect(result.granted).toEqual([held.identifier]);
            expect(result.skipped).toEqual([{ identifier: notHeld.identifier, reason: "no access" }]);
            expect(await itemIdentifiersAccessibleTo(invitee)).toEqual([held.identifier]);
        });
        it("lets an administrator grant items they were never invited to", async () => {
            let item = await createItemFor({ userId: inviter.id });
            await collection.addItem(item);

            let result = await invite({
                session: await createSession({ user: admin }),
                email: invitee.email,
                includeItems: true,
            });
            expect(result.granted).toEqual([item.identifier]);
            expect(result.skipped).toEqual([]);
            expect(await itemIdentifiersAccessibleTo(invitee)).toEqual([item.identifier]);
        });
        it("leaves items that belong only to a sub-collection untouched", async () => {
            let subCollection = await createCollection({
                identifier: chance.word(),
                userId: inviter.id,
            });
            let item = await createItemFor({ userId: inviter.id });
            await subCollection.addItem(item);
            await collection.addSubCollection(subCollection);

            let result = await invite({
                session: await createSession({ user: inviter }),
                email: invitee.email,
                includeItems: true,
            });
            expect(result).toEqual({ granted: [], skipped: [] });
            expect(await itemIdentifiersAccessibleTo(invitee)).toEqual([]);

            await deleteCollection({ id: subCollection.id });
            await removeStore({ id: subCollection.identifier, type: "collection" });
        });
        it("is a no-op when repeated for the same user", async () => {
            let item = await createItemFor({ userId: inviter.id });
            await collection.addItem(item);
            let session = await createSession({ user: inviter });

            await invite({ session, email: invitee.email, includeItems: true });
            let result = await invite({ session, email: invitee.email, includeItems: true });
            expect(result.granted).toEqual([item.identifier]);
            expect(await itemIdentifiersAccessibleTo(invitee)).toEqual([item.identifier]);
            expect((await collection.getUsers()).length).toEqual(2);
        });
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
