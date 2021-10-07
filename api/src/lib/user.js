import models from "../models";
import { loadConfiguration } from "../common";
import { uniqBy } from "lodash";

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

    // deny access if the user is not an admin and we don't
    //  have an entry for them as a result of admin invitation.
    let user = await models.user.findOne({ where: { email: data.email } });
    if (!user && !configuration.api.administrators.includes(data.email)) {
        throw new Error(`Unauthorised`);
    }

    if (!user && configuration.api.administrators.includes(data.email)) {
        data.locked = false;
        data.upload = true;
        data.administrator = true;
        user = (
            await models.user.findOrCreate({
                where: { email: data.email },
                defaults: data,
            })
        )[0];
    } else if (user && !configuration.api.administrators.includes(data.email)) {
        user.locked = false;
        user.upload = false;
        user.administrator = false;
        user.provider = data.provider;
        user.givenName = data.givenName;
        user.familyName = data.familyName;

        await user.save();
    }
    return user;
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

export async function createAllowedUserStubAccounts({ emails }) {
    let users = emails.map((email) => {
        return {
            email,
            provider: "unset",
            locked: false,
            upload: false,
            administrator: false,
        };
    });
    users = await models.user.bulkCreate(users, { ignoreDuplicates: true });

    return uniqBy(users, "email");
}
