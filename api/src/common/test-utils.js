import { loadConfiguration } from "./configuration.js";
import fsExtraPkg from "fs-extra";
const { writeJSON } = fsExtraPkg;
import models from "../models/index.js";
import Chance from "chance";
const chance = Chance();
import lodashPkg from "lodash";
const { range, cloneDeep } = lodashPkg;
import { createItem } from "../lib/item.js";

export const host = `http://localhost:8080`;

export function headers(session) {
    return {
        authorization: `Bearer ${session.token}`,
        "Content-Type": "application/json",
        testing: true,
    };
}
export async function setupBeforeAll({ adminEmails = [] }) {
    let configuration = await loadConfiguration();

    let devConfiguration = cloneDeep(configuration);
    devConfiguration.api.administrators = adminEmails;
    await writeJSON("/srv/configuration/development-configuration.json", devConfiguration, {
        spaces: 4,
    });
    return configuration;
}

export async function setupBeforeEach({ emails = [], adminEmails = [] }) {
    let users = [];
    for (let email of emails) {
        let user = await models.user.create({
            email: email,
            provider: "unset",
            locked: false,
            upload: false,
            administrator: false,
        });
        users.push(user);
    }
    for (let email of adminEmails) {
        let user = await models.user.create({
            email: email,
            provider: "unset",
            locked: false,
            upload: false,
            administrator: true,
        });
        users.push(user);
    }
    return users;
}

export async function teardownAfterEach({ users = [] }) {
    for (let user of users) {
        await user.destroy();
    }
}

export async function teardownAfterAll(configuration) {
    await writeJSON("/srv/configuration/development-configuration.json", configuration, {
        spaces: 4,
    });
    models.sequelize.close();
}

export async function generateLogs(info, warn, error) {
    for (let i in range(info)) {
        await models.log.create({ level: "info", owner: chance.email(), text: chance.sentence() });
    }
    for (let i in range(warn)) {
        await models.log.create({ level: "warn", owner: chance.email(), text: chance.sentence() });
    }
    for (let i in range(error)) {
        await models.log.create({ level: "error", owner: chance.email(), text: chance.sentence() });
    }
}

export async function setupTestItem({ identifier, store, user }) {
    let item = await createItem({ identifier, userId: user.id });
    expect(item.identifier).toEqual(identifier);

    await store.put({
        json: { some: "thing" },
        target: `${identifier}-01.json`,
    });
    await store.put({
        content: "text",
        target: `${identifier}-01.txt`,
    });
    await store.put({
        json: { some: "thing" },
        target: `${identifier}-02.json`,
    });
    await store.put({
        content: "text",
        target: `${identifier}-02.txt`,
    });
    return { item };
}
