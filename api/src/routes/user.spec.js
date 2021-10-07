require("regenerator-runtime");
import { createUser } from "../lib/user";
import models from "../models";
const chance = require("chance").Chance();
import fetch from "node-fetch";
import { createSession } from "../lib/session";
import { host, setupBeforeAll, teardownAfterAll } from "../common";

describe("User management route tests as admin", () => {
    let configuration, users;
    const adminEmail = chance.email();
    let user, session;
    beforeAll(async () => {
        configuration = await setupBeforeAll({ adminEmails: [adminEmail] });
    });
    beforeEach(async () => {
        user = await createUser({ email: adminEmail, provider: "unset" });
        session = await createSession({ user });
    });
    afterEach(async () => {
        try {
            await user.destroy();
        } catch (error) {}
    });
    afterAll(async () => {
        await teardownAfterAll(configuration);
    });
    it("should be able to get a list of users", async () => {
        // expect to find one user
        let response = await fetch(`${host}/admin/users`, {
            headers: {
                authorization: `Bearer ${session.token}`,
                "Content-Type": "application/json",
            },
        });
        expect(response.status).toEqual(200);
        ({ users } = await response.json());
        expect(users.length).toEqual(1);
    });
    it("should be able to invite users", async () => {
        let email = chance.email();
        let response = await fetch(`${host}/admin/users`, {
            method: "POST",
            headers: {
                authorization: `Bearer ${session.token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ emails: [email] }),
        });
        expect(response.status).toEqual(200);

        response = await fetch(`${host}/admin/users`, {
            headers: {
                authorization: `Bearer ${session.token}`,
                "Content-Type": "application/json",
            },
        });
        let { users } = await response.json();
        for (let user of users) {
            await models.user.destroy({ where: { id: user.id } });
        }
    });
    it("should be able to toggle a user capability", async () => {
        let response = await fetch(`${host}/admin/users/${user.id}/upload`, {
            method: "PUT",
            headers: {
                authorization: `Bearer ${session.token}`,
                "Content-Type": "application/json",
            },
        });
        expect(response.status).toEqual(200);
        user = await models.user.findOne({ where: { id: user.id } });
        expect(user.upload).toEqual(false);
    });
    it("should be able to delete a user", async () => {
        let response = await fetch(`${host}/admin/users/${user.id}`, {
            method: "DELETE",
            headers: {
                authorization: `Bearer ${session.token}`,
                "Content-Type": "application/json",
            },
        });
        expect(response.status).toEqual(200);
        user = await models.user.findOne({ where: { id: user.id } });
        expect(user).toEqual(null);
    });
});
