require("regenerator-runtime");
const { getUsers } = require("./user");
const models = require("../models");
const chance = require("chance").Chance();

describe("User management tests", () => {
    let application;
    beforeAll(async () => {
        application = await models.application.create({
            name: "Test Application",
            origin: "http://test.app.com",
            secret: "supersecret",
        });
    });
    afterAll(async () => {
        await application.destroy();
    });
    it("should be able to get a list of users", async () => {
        let user = await models.user.create({
            identifier: chance.word(),
            name: chance.word(),
            applicationId: application.id,
        });

        // expect to find one user
        let { users } = await getUsers({ applicationId: application.id });
        expect(users.length).toEqual(1);

        // expect to find no users
        ({ users } = await getUsers({ applicationId: application.id, page: 1 }));
        expect(users.length).toEqual(0);

        // expect to find no users
        ({ users } = await getUsers({ applicationId: application.id, page: 0, limit: 0 }));
        expect(users.length).toEqual(0);

        await user.destroy();
    });

    it("should be able to get a specified user", async () => {});
    it("should be able to create a new user", async () => {});
    it("should be able to delete a user", async () => {});
});
