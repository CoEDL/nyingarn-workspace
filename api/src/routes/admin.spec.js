require("regenerator-runtime");
import { createSession } from "../lib/session.js";
import Chance from "chance";
const chance = Chance();
import fetch from "cross-fetch";
import { getStoreHandle, TestSetup, headers, host } from "../common";

import lodashPkg from "lodash";
const { isArray } = lodashPkg;

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
        store = await getStoreHandle({
            id: identifier,
            className: "collection",
        });
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
    it("should be able to get a list of all items and collections", async () => {
        let user = users.filter((u) => u.administrator)[0];
        let session = await createSession({ user });
        let response = await fetch(`${host}/admin/entries`, {
            method: "GET",
            headers: headers(session),
        });
        expect(response.status).toEqual(200);
        response = await response.json();
        expect(isArray(response.items)).toBeTrue;
        expect(isArray(response.collections)).toBeTrue;
    });
});
