require("regenerator-runtime");
const { createUser } = require("./user");
import { generateToken, verifyToken } from "./jwt";
import { loadConfiguration } from "../common";
const chance = require("chance").Chance();
const MockDate = require("mockdate");
const { copy, move, readJSON, writeJSON } = require("fs-extra");

describe("JWT tests", () => {
    it("should be able to create a jwt", async () => {
        const userDef = {
            email: chance.email(),
            givenName: chance.word(),
            familyName: chance.word(),
            provider: chance.word(),
        };
        let configuration = await loadConfiguration();
        let user = await createUser(userDef);
        let { token, expires } = await generateToken({ configuration, user });
        expect(token).toBeDefined;
        expect(expires).toBeDefined;

        await user.destroy();
    });
    it("should be able to verify a jwt", async () => {
        const userDef = {
            email: chance.email(),
            givenName: chance.word(),
            familyName: chance.word(),
            provider: chance.word(),
        };
        let configuration = await loadConfiguration();
        let user = await createUser(userDef);

        let { token, expires } = await generateToken({ configuration, user });

        let data = await verifyToken({ token, configuration });
        expect(data.email).toEqual(userDef.email);

        await user.destroy();
    });
    it("should throw because the jwt is expired", async () => {
        const userDef = {
            email: chance.email(),
            givenName: chance.word(),
            familyName: chance.word(),
            provider: chance.word(),
        };
        let configuration = await loadConfiguration();
        let user = await createUser(userDef);

        MockDate.set("2000-11-22");
        let { token, expires } = await generateToken({ configuration, user });
        MockDate.reset();

        try {
            let data = await verifyToken({ token, configuration });
        } catch (error) {
            expect(error.message).toBe("token expired");
        }

        await user.destroy();
    });
    it("should throw because the jwt is unverified", async () => {
        const userDef = {
            email: chance.email(),
            givenName: chance.word(),
            familyName: chance.word(),
            provider: chance.word(),
        };
        let configuration = await loadConfiguration();
        let user = await createUser(userDef);

        let { token, expires } = await generateToken({ configuration, user });

        await copy(
            "/srv/configuration/development-configuration.json",
            "/srv/configuration/development-configuration-copy.json"
        );
        let config = await readJSON("/srv/configuration/development-configuration.json");
        config.api.session.secret = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";
        await writeJSON("/srv/configuration/development-configuration.json", config);
        configuration = await loadConfiguration();
        try {
            let data = await verifyToken({ token, configuration });
        } catch (error) {
            expect(error.message).toBe("signature verification failed");
        }

        move(
            "/srv/configuration/development-configuration-copy.json",
            "/srv/configuration/development-configuration.json",
            { overwrite: true }
        );
        await user.destroy();
    });
});
