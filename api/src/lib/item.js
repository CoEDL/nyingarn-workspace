import models from "../models";
import { loadConfiguration, getS3Handle, getUserTempLocation } from "../common";
import path from "path";
import { writeJson, remove } from "fs-extra";

export async function lookupItemByIdentifier({ identifier, userId }) {
    let clause = {
        where: { identifier },
    };
    if (userId) {
        clause.include = [
            { model: models.user, where: { id: userId }, attributes: ["id"], raw: true },
        ];
    }
    return await models.item.findOne(clause);
}

export async function getItems({ userId, offset = 0, limit = 10 }) {
    let include = [];
    if (userId) include.push({ model: models.user, where: { id: userId } });
    return await models.item.findAndCountAll({
        offset,
        limit,
        include,
    });
}

export async function createItem({ identifier, userId }) {
    let item = await models.item.findOne({ where: { identifier } });
    if (item) {
        throw new Error("An item with that identifier already exists.");
    }

    item = await models.item.create({ identifier });
    await linkItemToUser({ itemId: item.id, userId });
    await createItemLocationInObjectStore({ identifier, userId });
    return item;
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

export async function listItemResources({ identifier }) {
    let { bucket } = await getS3Handle();
    let resources = await bucket.listObjects({ prefix: identifier });
    return { resources: resources.Contents };
}

export async function createItemLocationInObjectStore({ identifier, userId }) {
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
        await remove(tempdir);
    }
}

export async function itemResourceExists({ identifier, resource }) {
    let { bucket } = await getS3Handle();
    let target = path.join(identifier, resource);
    let stat = await bucket.stat({ path: target });
    return stat;
}

export async function getItemResource({ identifier, resource }) {
    let { bucket } = await getS3Handle();
    let target = path.join(identifier, resource);
    if (!(await bucket.stat({ path: target }))) {
        throw new Error("Not found");
    } else {
        return await bucket.download({ target });
    }
}

export async function putItemResource({
    identifier,
    resource,
    localPath = undefined,
    content = undefined,
    json,
}) {
    let { bucket } = await getS3Handle();
    let target = path.join(identifier, resource);
    return await bucket.upload({ target, localPath, content, json });
}

export async function getItemResourceLink({ identifier, resource }) {
    let { bucket } = await getS3Handle();
    let target = path.join(identifier, resource);
    if (!(await bucket.stat({ path: target }))) {
        throw new Error("Not found");
    } else {
        return await bucket.getPresignedUrl({ target });
    }
}
