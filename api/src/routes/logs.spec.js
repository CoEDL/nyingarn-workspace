require("regenerator-runtime");
import models from "../models";
import { createUser } from "../lib/user";
import { createSession } from "../lib/session";
import fetch from "node-fetch";
import { host, setupBeforeAll, teardownAfterAll, generateLogs } from "../common";
const chance = require("chance").Chance();

describe("Log management tests", () => {
    let configuration, users;
    const adminEmail = chance.email();
    let user, session;
    beforeAll(async () => {
        await models.log.destroy({ where: {} });
        configuration = await setupBeforeAll({ adminEmails: [adminEmail] });
    });
    beforeEach(async () => {
        user = await createUser({ email: adminEmail, provider: "unset" });
        session = await createSession({ user });
    });
    afterEach(async () => {
        try {
            await models.log.destroy({ where: {} });
            await user.destroy();
        } catch (error) {}
    });
    afterAll(async () => {
        await teardownAfterAll(configuration);
    });

    test("it should be able to get user logs out of the system", async () => {
        await generateLogs(1, 0, 0);
        let response = await fetch(`${host}/admin/logs`, {
            headers: {
                authorization: `Bearer ${session.token}`,
                "Content-Type": "application/json",
            },
        });
        let { logs } = await response.json();
        expect(logs.count).toEqual(1);
    });
    test("it should be able to page through logs", async () => {
        await generateLogs(1, 0, 0);
        let response = await fetch(`${host}/admin/logs`, {
            headers: {
                authorization: `Bearer ${session.token}`,
                "Content-Type": "application/json",
            },
        });
        let logs1 = (await response.json()).logs;

        await generateLogs(1, 0, 0);
        response = await fetch(`${host}/admin/logs?offset=1`, {
            headers: {
                authorization: `Bearer ${session.token}`,
                "Content-Type": "application/json",
            },
        });
        let logs2 = (await response.json()).logs;
        expect(logs1.rows[0].id).not.toEqual(logs2.rows[0].id);
    });
    test("it should be able to get logs of a defined level out", async () => {
        await generateLogs(1, 1, 1);
        let response = await fetch(`${host}/admin/logs?level=info`, {
            headers: {
                authorization: `Bearer ${session.token}`,
                "Content-Type": "application/json",
            },
        });
        let logs = (await response.json()).logs;
        expect(logs.count).toEqual(1);
        expect(logs.rows[0].level).toEqual("info");

        response = await fetch(`${host}/admin/logs?level=error`, {
            headers: {
                authorization: `Bearer ${session.token}`,
                "Content-Type": "application/json",
            },
        });
        logs = (await response.json()).logs;
        expect(logs.count).toEqual(1);
        expect(logs.rows[0].level).toEqual("error");
    });
});
