import { loadConfiguration } from "../common";
import { writeJSON } from "fs-extra";
import { cloneDeep } from "lodash";
import models from "../models";
const chance = require("chance").Chance();
import { range } from "lodash";
import { createItem } from "../lib/item";

export const host = `http://localhost:8080`;

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

export async function setupTestItem({ user, bucket }) {
    const identifier = chance.word();
    let item = await createItem({ identifier, userId: user.id });
    expect(item.identifier).toEqual(identifier);

    await bucket.upload({
        json: { some: "thing" },
        target: `${identifier}/${identifier}-01.json`,
    });
    await bucket.upload({
        content: "text",
        target: `${identifier}/${identifier}-01.txt`,
    });
    await bucket.upload({
        json: { some: "thing" },
        target: `${identifier}/${identifier}-02.json`,
    });
    await bucket.upload({
        content: "text",
        target: `${identifier}/${identifier}-02.txt`,
    });

    return { item, identifier };
}
