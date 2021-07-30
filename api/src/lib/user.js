const models = require("../models");

export async function getUsers({ applicationId, page = 0, limit = 10 }) {
    let users = await models.user.findAll({
        where: {
            applicationId,
        },
        offset: page,
        limit,
    });
    return { users: users.map((u) => u.get()) };
}

export async function getUser() {}

export async function createUser() {}

export async function deleteUser() {}
