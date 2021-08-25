import models from "../models";

export async function lookupItemByIdentifier({ identifier }) {
    return await models.item.findOne({ where: { identifier } });
}

export async function createItem({ identifier }) {
    return await models.item.create({ identifier });
}

export async function deleteItem({ id }) {
    await models.item.destroy({ where: { id } });
}

export async function linkItemToUser({ itemId, userId }) {
    return await models.item_user.findOrCreate({
        where: { itemId, userId },
        defaults: { itemId, userId },
    });
}
