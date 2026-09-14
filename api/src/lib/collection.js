import models from "../models/index.js";
import { Op, fn as seqFn, col as seqCol } from "sequelize";
import { getStoreHandle } from "../common/getS3Handle.js";
import { logEvent, getLogger } from "../common/logger.js";
import { lookupItemByIdentifier, linkItemToUser } from "./item.js";
const log = getLogger();

export async function lookupCollectionByIdentifier({ identifier, userId }) {
    let clause = {
        where: { identifier },
        include: [{ model: models.user }],
    };
    if (userId) {
        clause.include = [
            { model: models.user, where: { id: userId }, attributes: ["id", "email"], raw: true },
        ];
    } else {
        clause.include = [{ model: models.user, attributes: ["id", "email"], raw: true }];
    }
    return await models.collection.findOne(clause);
}

export async function getCollections({ userId, offset = 0, limit = 10, match, publicationStatus }) {
    const query = {
        order: [[seqFn("lower", seqCol("collection.identifier")), "ASC"]],
    };
    let include = [{ model: models.item }, { model: models.collection, as: "subCollection" }];
    if (userId) include.push({ model: models.user, where: { id: userId } });
    if (limit) {
        query.offset = offset;
        query.limit = limit;
    }
    query.where = {};
    if (match) {
        query.where.identifier = {
            [Op.iLike]: `%${match}%`,
        };
    }
    if (publicationStatus) {
        query.where.publicationStatus = publicationStatus;
    }
    query.include = include;

    let collections = await models.collection.findAndCountAll(query);
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
    let store = await getStoreHandle({ id: identifier, type: "collection" });
    let exists = await store.exists();
    if (!exists) {
        await store.createObject();
    }
}

export async function deleteCollection({ id }) {
    await models.collection.destroy({ where: { id } });
}

export async function toggleCollectionVisibility({ collectionId }) {
    let collection = await models.collection.findOne({ where: { id: collectionId } });
    if (!collection.data) collection.data = {};
    collection.data.private = collection.data.private ? !collection.data?.private : true;
    collection.changed("data", true);
    collection = await collection.save();
}

export async function inviteUserToCollectionItems({ inviter, invitee, collection }) {
    let granted = [];
    let skipped = [];
    for (let item of await collection.getItems()) {
        let inviterHasAccess =
            inviter.administrator ||
            (await lookupItemByIdentifier({ identifier: item.identifier, userId: inviter.id }));
        if (!inviterHasAccess) {
            skipped.push({ identifier: item.identifier, reason: "no access" });
            continue;
        }
        try {
            await linkItemToUser({ itemId: item.id, userId: invitee.id });
            await logEvent({
                level: "info",
                owner: inviter.email,
                text: `User '${inviter.email}' invited '${invitee.email}' to '${item.identifier}'`,
            });
            granted.push(item.identifier);
        } catch (error) {
            log.error(
                `Failed to invite '${invitee.email}' to '${item.identifier}': ${error.message}`
            );
            skipped.push({ identifier: item.identifier, reason: "failed" });
        }
    }
    return { granted, skipped };
}
