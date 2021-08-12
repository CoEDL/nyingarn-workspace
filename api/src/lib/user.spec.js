require("regenerator-runtime");
const { getUsers, getUser, createUser, disableUser, enableUser } = require("./user");
const models = require("../models");
const chance = require("chance").Chance();

describe("User management tests", () => {
    it("should be able to get a list of users", async () => {
        const userDef = {
            email: chance.email(),
            givenName: chance.word(),
            familyName: chance.word(),
            provider: chance.word(),
            locked: false,
        };
        let user = await models.user.create(userDef);

        // expect to find one user
        let { users } = await getUsers({});
        expect(users.length).toEqual(1);
        expect(users[0].email).toEqual(userDef.email);

        // expect to find no users
        ({ users } = await getUsers({ page: 1 }));
        expect(users.length).toEqual(0);

        // expect to find no users
        ({ users } = await getUsers({ age: 0, limit: 0 }));
        expect(users.length).toEqual(0);

        await user.destroy();
    });
    it("should be able to get a specified user", async () => {
        const userDef = {
            email: chance.email(),
            givenName: chance.word(),
            familyName: chance.word(),
            provider: chance.word(),
        };
        let user = await createUser(userDef);
        user = await getUser({ userId: user.id });
        expect(user.email).toEqual(userDef.email);

        user = await getUser({ email: userDef.email });
        expect(user.email).toEqual(userDef.email);
        await user.destroy();

        user = await getUser({ email: chance.word() });
        expect(user).toBeNull;
    });
    it("should be able to create a new user", async () => {
        const userDef = {
            email: chance.email(),
            givenName: chance.word(),
            familyName: chance.word(),
            provider: chance.word(),
        };
        let user = await createUser(userDef);
        expect(user.email).toEqual(userDef.email);
        await user.destroy();
    });
    it("should be able to disable / re-enable a user", async () => {
        const userDef = {
            email: chance.email(),
            givenName: chance.word(),
            familyName: chance.word(),
            provider: chance.word(),
        };
        let user = await createUser(userDef);

        user = await disableUser({ userId: user.id });
        expect(user.locked).toEqual(true);

        user = await enableUser({ userId: user.id });
        expect(user.locked).toEqual(false);

        await user.destroy();
    });
});
