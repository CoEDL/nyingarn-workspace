require("regenerator-runtime");
import {
    getUsers,
    getUser,
    findUserOrCreateAdministrator,
    deleteUser,
    toggleUserCapability,
    createAllowedUserStubAccounts,
} from "./user";
const chance = require("chance").Chance();
import { TestSetup } from "../common/test-utils.js";

describe("User management tests", () => {
    let configuration, users, userEmail, adminEmail, bucket;
    let identifier, store;
    const tester = new TestSetup();

    beforeAll(async () => {
        ({ userEmail, adminEmail, configuration, bucket } = await tester.setupBeforeAll());
        users = await tester.setupUsers({ emails: [userEmail], adminEmails: [adminEmail] });
    });
    beforeEach(async () => {
        identifier = chance.word();
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
    it("should be able to get a list of users", async () => {
        let user = users.filter((u) => !u.administrator)[0];
        // expect to find two users
        let accounts = await getUsers({});
        expect(accounts.users.length).toEqual(2);
        expect(accounts.users[0].email).toEqual(user.email);

        // expect to find no users
        accounts = await getUsers({ offset: 10 });
        expect(accounts.users.length).toEqual(0);

        // // expect to find no users
        accounts = await getUsers({ age: 0, limit: 0 });
        expect(accounts.users.length).toEqual(0);
    });
    it("should be able to get a specified user", async () => {
        let userDef = users.filter((u) => !u.administrator)[0];
        let user = await getUser({ userId: userDef.id });
        expect(user.email).toEqual(userDef.email);

        user = await getUser({ email: userDef.email });
        expect(user.email).toEqual(userDef.email);

        user = await getUser({ email: chance.word() });
        expect(user).toBeNull;
    });
    it("should find an existing user by email", async () => {
        let userDef = users.filter((u) => !u.administrator)[0];
        let user = await findUserOrCreateAdministrator({ email: userDef.email, configuration });
        expect(user.id).toEqual(userDef.id);
        expect(user.administrator).toEqual(false);
    });
    it("should create an administrator listed in the configuration", async () => {
        let email = chance.email();
        let user = await findUserOrCreateAdministrator({
            email,
            configuration: { api: { administrators: [email] } },
        });
        expect(user.email).toEqual(email);
        expect(user.administrator).toEqual(true);
        expect(user.upload).toEqual(true);
        expect(user.locked).toEqual(false);
        expect(user.provider).toEqual("email");
        await user.destroy();
    });
    it("should not create an unknown user", async () => {
        let email = chance.email();
        let user = await findUserOrCreateAdministrator({ email, configuration });
        expect(user).toBeNull();
        expect(await getUser({ email })).toBeNull();
    });
    it("should be able to lock a user", async () => {
        let user = users.filter((u) => !u.administrator)[0];

        user = await toggleUserCapability({
            userId: user.id,
            capability: "lock",
        });
        expect(user.locked).toEqual(true);

        user = await toggleUserCapability({
            userId: user.id,
            capability: "lock",
        });
        expect(user.locked).toEqual(false);
    });
    it("should be able to toggle a user as an admin", async () => {
        let user = users.filter((u) => !u.administrator)[0];

        user = await toggleUserCapability({
            userId: user.id,
            capability: "upload",
        });
        expect(user.upload).toEqual(true);

        user = await toggleUserCapability({
            userId: user.id,
            capability: "upload",
        });
        expect(user.upload).toEqual(false);
    });
    it("should be able to toggle user upload privileges", async () => {
        let user = users.filter((u) => !u.administrator)[0];
        user = await toggleUserCapability({
            userId: user.id,
            capability: "admin",
        });
        expect(user.administrator).toEqual(true);

        user = await toggleUserCapability({
            userId: user.id,
            capability: "admin",
        });
        expect(user.administrator).toEqual(false);
    });
    it("should be able to create user stub accounts", async () => {
        let emails = [chance.email()];
        let users = await createAllowedUserStubAccounts({
            accounts: [{ email: emails[0], givenName: chance.word(), familyName: chance.word() }],
        });
        expect(users.length).toEqual(1);
        expect(emails).toEqual([users[0].email]);
        for (let user of users) await user.destroy();

        let email = chance.email();
        emails = [email, email];
        users = await createAllowedUserStubAccounts({
            accounts: [{ email: emails[1], givenName: chance.word(), familyName: chance.word() }],
        });
        expect(users.length).toEqual(1);
    });
});
