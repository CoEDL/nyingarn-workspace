require("regenerator-runtime");
const models = require("./models");
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
    it("should be able to get through the middleware with a known secret", async () => {
        let response = await fetch("http://localhost:8080/test-middleware", {
            headers: {
                authorization: application.secret,
            },
        });
        expect(response.status).toEqual(200);
    });
    it("should fail to get through the middleware", async () => {
        let response = await fetch("http://localhost:8080/test-middleware", {
            headers: {
                authorization: "bad secret",
            },
        });
        expect(response.status).toEqual(401);
    });
});
