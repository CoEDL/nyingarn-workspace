import "regenerator-runtime";
import fetch from "node-fetch";
import { generateToken } from "../common/jwt.js";
import { loadConfiguration } from "../common/configuration.js";
const chance = require("chance").Chance();
import { TestSetup, host } from "../common/test-utils.js";
import { getStoreHandle } from "../common/getS3Handle";

describe("Test loading the configuration", () => {
    test("it should be able to load the default configuration for the environment", async () => {
        let response = await fetch(`${host}/configuration`);
        expect(response.status).toEqual(200);
        let configuration = await response.json();
        expect(configuration).toHaveProperty("authentication");
    });
});

describe("Test the /authenticated endpoint", () => {
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

    test("it should be ok", async () => {
        let configuration = await loadConfiguration();
        let user = users[0];
        let { token, expires } = await generateToken({ configuration, user });

        let response = await fetch(`${host}/authenticated`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        expect(response.status).toBe(200);
    });
    test("it should fail with unauthorised", async () => {
        let response = await fetch(`${host}/authenticated`, {
            headers: { Authorization: `Bearer xxx` },
        });
        expect(response.status).toBe(401);
    });
});
