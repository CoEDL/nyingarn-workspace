require("regenerator-runtime");
import { createSession } from "../lib/session.js";
import Chance from "chance";
const chance = Chance();
import fetch from "cross-fetch";
import {
    host,
    headers,
    setupBeforeAll,
    setupBeforeEach,
    teardownAfterAll,
    teardownAfterEach,
    setupTestItem,
    getS3Handle,
} from "../common/index.js";
import lodashPkg from "lodash";
const { isArray } = lodashPkg;

describe("Admin route tests", () => {
    let configuration, users, bucket, session, user;
    const userEmail = chance.email();
    const adminEmail = chance.email();
    beforeAll(async () => {
        configuration = await setupBeforeAll({ adminEmails: [adminEmail] });
        ({ bucket } = await getS3Handle());
    });
    beforeEach(async () => {
        users = await setupBeforeEach({ emails: [userEmail], adminEmails: [adminEmail] });
        session = await createSession({ user: users.filter((u) => u.administrator)[0] });
    });
    afterEach(async () => {
        await teardownAfterEach({ users });
    });
    afterAll(async () => {
        await teardownAfterAll(configuration);
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
