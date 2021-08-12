import "regenerator-runtime";
import fetch from "node-fetch";
const { createUser } = require("../lib/user");
import { generateToken } from "../lib/jwt";
import { loadConfiguration } from "../common";
const chance = require("chance").Chance();

describe("Test loading the configuration", () => {
    test("it should be able to load the default configuration for the environment", async () => {
        let response = await fetch(`http://localhost:8080/configuration`);
        expect(response.status).toEqual(200);
        let configuration = await response.json();
        expect(configuration).toHaveProperty("services");
    });
});

describe("Test the /authenticated endpoint", () => {
    test("it should be ok", async () => {
        const userDef = {
            email: chance.email(),
            givenName: chance.word(),
            familyName: chance.word(),
            provider: chance.word(),
        };
        let configuration = await loadConfiguration();
        let user = await createUser(userDef);
        let { token, expires } = await generateToken({ configuration, user });

        let response = await fetch("http://localhost:8080/authenticated", {
            headers: { Authorization: `Bearer ${token}` },
        });
        expect(response.status).toBe(200);

        await user.destroy();
    });
    test("it should fail with unauthorised", async () => {
        let response = await fetch("http://localhost:8080/authenticated", {
            headers: { Authorization: `Bearer xxx` },
        });
        expect(response.status).toBe(401);
    });
});
