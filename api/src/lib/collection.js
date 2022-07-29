import models from "../models";
import { getStoreHandle } from "../common";

export async function lookupCollectionByIdentifier({ identifier, userId }) {
    let clause = {
        where: { identifier },
        include: [{ model: models.user }],
    };
    if (userId) {
        clause.include = [
            { model: models.user, where: { id: userId }, attributes: ["id"], raw: true },
        ];
    }
    return await models.collection.findOne(clause);
}

export async function getCollections({ userId, offset = 0, limit = 10 }) {
    // let include = [{ model: models.item }, { model: models.collection, as: "subCollection" }];
    let include = [];
    if (userId) include.push({ model: models.user, where: { id: userId } });
    let collections = await models.collection.findAndCountAll({
        offset,
        limit,
        include,
        order: [["identifier", "ASC"]],
    });
    return collections;
}

export async function createCollection({ identifier, userId }) {
    let collection = await models.collection.findOne({ where: { identifier } });
    if (collection) {
        throw new Error(`A collection with that identifier already exists.`);
    }
    collection = await models.collection.create({ identifier, data: { private: true } });
    await linkCollectionToUser({ collectionId: collection.id, userId });
    await createCollectionLocationInObjectStore({ identifier });
    return collection;
}

export async function linkCollectionToUser({ collectionId, userId }) {
    let collection = await models.collection.findOne({ where: { id: collectionId } });
    let user = await models.user.findOne({ where: { id: userId } });
    await user.addCollections([collection]);
}

export async function createCollectionLocationInObjectStore({ identifier }) {
    let store = await getStoreHandle({ id: identifier, className: "collection" });
    let exists = await store.itemExists();
    if (!exists) {
        await store.createItem();
    }
}

export async function deleteCollection({ id }) {
    await models.collection.destroy({ where: { id } });
}

export async function toggleCollectionVisibility({ collectionId }) {
    let collection = await models.collection.findOne({ where: { id: collectionId } });
    collection.data.private = !collection.data.private;
    collection.changed("data", true);
    collection = await collection.save();
}
