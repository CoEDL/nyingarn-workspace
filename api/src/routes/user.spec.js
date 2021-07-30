require("regenerator-runtime");
const { getUsers } = require("./user");
const models = require("../models");
const chance = require("chance").Chance();
const fetch = require("node-fetch");

describe("User management route tests", () => {
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
        let response = await fetch("http://localhost:8080/user", {
            headers: {
                authorization: application.secret,
            },
        });
        expect(response.status).toEqual(200);
        let { users } = await response.json();
        expect(users.length).toEqual(1);

        // expect to find no users
        response = await fetch("http://localhost:8080/user?page=10", {
            headers: {
                authorization: application.secret,
            },
        });
        expect(response.status).toEqual(200);
        ({ users } = await response.json());
        expect(users.length).toEqual(0);

        // expect to find no users
        response = await fetch("http://localhost:8080/user?page=0&limit=0", {
            headers: {
                authorization: application.secret,
            },
        });
        expect(response.status).toEqual(200);
        ({ users } = await response.json());
        expect(users.length).toEqual(0);

        await user.destroy();
    });

    it("should be able to get a specified user", async () => {});
    it("should be able to create a new user", async () => {});
    it("should be able to delete a user", async () => {});
});
