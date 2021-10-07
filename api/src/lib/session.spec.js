require("regenerator-runtime");
const { getSession, createSession, destroySession } = require("./session");
const { createUser } = require("./user");
const chance = require("chance").Chance();
import { setupBeforeAll, setupBeforeEach, teardownAfterAll, teardownAfterEach } from "../common";

describe("Session management tests", () => {
    let users, configuration;
    const userEmail = chance.email();
    const adminEmail = chance.email();
    beforeAll(async () => {
        configuration = await setupBeforeAll({ adminEmails: [adminEmail] });
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
    it("should be able to create a session", async () => {
        let user = users[0];
        let session = await createSession({ user });
        expect(session.token).toBeDefined();

        await user.destroy();
        await session.destroy();
    });
    it("should be able to get a session", async () => {
        let user = users[0];
        let session = await createSession({ user });

        let s = await getSession({ userId: user.id });
        expect(s.token).toEqual(session.token);

        s = await getSession({ sessionId: session.id });
        expect(s.token).toEqual(session.token);

        await user.destroy();
        await session.destroy();
    });
    it("should be able to destroy a session", async () => {
        let user = users[0];
        let session = await createSession({ user });

        await destroySession({ sessionId: session.id });

        let s = await getSession({ sessionId: session.id });
        expect(s).toBeNull;

        await user.destroy();
        await session.destroy();
    });
});
