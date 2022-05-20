import models from "../models";
import { loadConfiguration, getS3Handle, getUserTempLocation } from "../common";
import path from "path";
import { writeJson, remove } from "fs-extra";

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
    let include = [];
    if (userId) include.push({ model: models.user, where: { id: userId } });
    return await models.collection.findAndCountAll({
        offset,
        limit,
        include,
    });
}

export async function createCollection({ identifier, userId }) {
    let collection = await models.collection.findOne({ where: { identifier } });
    let item = await models.item.findOne({ where: { identifier } });
    if (collection) {
        throw new Error(`A collection with that identifier already exists.`);
    }
    if (item) {
        throw new Error(`An item with that identifier already exists.`);
    }

    collection = await models.collection.create({ identifier, data: { private: true } });
    await linkCollectionToUser({ collectionId: collection.id, userId });
    await createCollectionLocationInObjectStore({ identifier, userId });
    return collection;
}

export async function linkCollectionToUser({ collectionId, userId }) {
    let collection = await models.collection.findOne({ where: { id: collectionId } });
    let user = await models.user.findOne({ where: { id: userId } });
    await user.addCollections([collection]);
}

export async function createCollectionLocationInObjectStore({ identifier, userId }) {
    let { bucket } = await getS3Handle();

    let pathExists = await bucket.pathExists({ path: identifier });
    if (!pathExists) {
        // create stub ro-crate file
        let context = ["https://w3id.org/ro/crate/1.1/context"];
        let graph = [
            {
                "@id": "ro-crate-metadata.json",
                "@type": "CreativeWork",
                conformsTo: {
                    "@id": "https://w3id.org/ro/crate/1.1/context",
                },
                about: {
                    "@id": "./",
                },
            },
            {
                "@id": "./",
                "@type": "Dataset",
                name: identifier,
            },
        ];
        let tempdir = await getUserTempLocation({ userId });
        let crateFile = path.join(tempdir, "ro-crate-metadata.json");
        await writeJson(crateFile, {
            "@context": context,
            "@graph": graph,
        });
        await bucket.upload({
            localPath: crateFile,
            target: path.join(identifier, "ro-crate-metadata.json"),
        });
        await bucket.upload({ json: {}, target: path.join(identifier, ".collection") });
        await remove(tempdir);
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
