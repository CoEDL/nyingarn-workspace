require("regenerator-runtime");
const { getSession, createSession, destroySession } = require("./session");
const { createUser } = require("./user");
const models = require("../models");
const chance = require("chance").Chance();

describe("Session management tests", () => {
    it("should be able to create a session", async () => {
        const userDef = {
            email: chance.email(),
            givenName: chance.word(),
            familyName: chance.word(),
            provider: chance.word(),
        };
        let user = await createUser(userDef);

        let session = await createSession({ user });
        expect(session.token).toBeDefined();

        await user.destroy();
        await session.destroy();
    });
    it("should be able to get a session", async () => {
        const userDef = {
            email: chance.email(),
            givenName: chance.word(),
            familyName: chance.word(),
            provider: chance.word(),
        };
        let user = await createUser(userDef);
        let session = await createSession({ user });

        let s = await getSession({ userId: user.id });
        expect(s.token).toEqual(session.token);

        s = await getSession({ sessionId: session.id });
        expect(s.token).toEqual(session.token);

        await user.destroy();
        await session.destroy();
    });

    it("should be able to destroy a session", async () => {
        const userDef = {
            email: chance.email(),
            givenName: chance.word(),
            familyName: chance.word(),
            provider: chance.word(),
        };
        let user = await createUser(userDef);
        let session = await createSession({ user });

        await destroySession({ sessionId: session.id });

        let s = await getSession({ sessionId: session.id });
        expect(s).toBeNull;

        await user.destroy();
        await session.destroy();
    });
});
