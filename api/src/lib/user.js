import models from "../models";

export async function getUsers({ page = 0, limit = 10 }) {
    let users = await models.user.findAll({
        offset: page,
        limit,
    });
    return { users };
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
    if (!data.email) {
        throw new Error(`Email is a required property`);
    }
    if (!data.provider) {
        throw new Error(`Provider is a required property`);
    }
    if (!data.locked) data.locked = false;
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
