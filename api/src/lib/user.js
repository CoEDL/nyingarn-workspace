import models from "../models/index.js";
import lodashPkg from "lodash";
const { uniqBy } = lodashPkg;

export async function getUsers({ offset = 0, limit = 10, orderBy = "familyName" }) {
    let direction = orderBy === "upload" ? "DESC" : "ASC NULLS LAST";
    let users = await models.user.findAndCountAll({
        offset,
        limit,
        order: [[orderBy, direction]],
    });
    return { total: users.count, users: users.rows.map((u) => u.get()) };
}

export async function getUser({ userId, email, orderBy }) {
    let where = {};
    if (userId) where.id = userId;
    if (email) where.email = email;
    let user = await models.user.findOne({
        where,
    });
    return user;
}

export async function findUserOrCreateAdministrator({ email, configuration }) {
    let user = await models.user.findOne({ where: { email } });
    if (user || !configuration.api.administrators.includes(email)) {
        return user;
    }

    return await models.user.create({
        email,
        locked: false,
        upload: true,
        administrator: true,
    });
}

export async function deleteUser({ userId }) {
    let user = await models.user.findOne({ where: { id: userId } });
    await user.destroy();
}

export async function toggleUserCapability({ userId, capability }) {
    let user = await models.user.findOne({ where: { id: userId } });
    switch (capability) {
        case "lock":
            user.locked = !user.locked;
            break;
        case "admin":
            user.administrator = !user.administrator;
            break;
        case "upload":
            user.upload = !user.upload;
            break;
    }
    user = await user.save();
    return user;
}

export async function createAllowedUserStubAccounts({ accounts }) {
    let users = accounts.map((user) => {
        return {
            email: user.email,
            givenName: user.givenName,
            familyName: user.familyName,
            locked: false,
            upload: false,
            administrator: false,
        };
    });
    users = await models.user.bulkCreate(users, { ignoreDuplicates: true });

    return uniqBy(users, "email");
}
