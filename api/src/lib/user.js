import models from "../models";
import { loadConfiguration } from "../common";

export async function getUsers({ offset = 0, limit = 10 }) {
    let users = await models.user.findAndCountAll({
        offset,
        limit,
        order: [
            ["givenName", "ASC"],
            ["familyName", "ASC"],
        ],
    });
    return { total: users.count, users: users.rows.map((u) => u.get()) };
}

export async function getUser({ userId, email }) {
    let where = {};
    if (userId) where.id = userId;
    if (email) where.email = email;
    let user = await models.user.findOne({
        where,
    });
    return user;
}

export async function createUser(data) {
    const configuration = await loadConfiguration();
    if (!data.email) {
        throw new Error(`Email is a required property`);
    }
    if (!data.provider) {
        throw new Error(`Provider is a required property`);
    }
    if (!data.locked) data.locked = false;
    data.administrator = configuration.api.administrators.includes(data.email);
    let user = await models.user.findOrCreate({
        where: { email: data.email },
        defaults: data,
    });
    return user[0];
}

export async function disableUser({ userId }) {
    let user = await models.user.findOne({ where: { id: userId } });
    user.locked = true;
    return await user.update();
}

export async function enableUser({ userId }) {
    let user = await models.user.findOne({ where: { id: userId } });
    user.locked = false;
    return await user.update();
}
