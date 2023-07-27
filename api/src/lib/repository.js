import { listObjects, getStoreHandle, getLogger, authorisedUsersFile } from "../common/index.js";
import { setRepositoryItemMetadata } from "./admin.js";
import models from "../models/index.js";
import { Op, fn as seqFn, col as seqCol } from "sequelize";
import { ROCrate } from "ro-crate";
const log = getLogger();

export async function getRepositoryItems({ user, prefix, limit = 10, offset = 0 }) {
    if (!user.administrator) {
        throw new Error(`User must be an admin`);
    }

    const query = {
        order: [[seqFn("lower", seqCol("repoitem.identifier")), "ASC"]],
        attributes: ["id", "identifier", "type"],
    };
    if (limit) {
        query.offset = offset;
        query.limit = limit;
    }
    query.where = {};
    if (prefix) {
        query.where.identifier = {
            [Op.iLike]: `%${prefix}%`,
        };
    }
    let { count: total, rows: items } = await models.repoitem.findAndCountAll(query);
    items = items.map((i) => i.get());

    return { items, total };
}

export async function importRepositoryContentFromStorageIntoTheDb({ user, configuration }) {
    if (!user.administrator) {
        throw new Error(`User must be an admin`);
    }

    // insert any items found on the backend storage not already in the DB
    let items =
        (await listObjects({ prefix: `/${configuration.api.domain}/repository/item` })) || [];
    items = items.map((item) => ({ identifier: item.id, type: "item" }));
    for (let item of items) {
        let store = await getStoreHandle({ ...item, location: "repository" });

        // register the repository item in the database
        item = await models.repoitem.findOrCreate({
            where: { ...item },
            default: { ...item },
        });
        item = item[0];

        // setup the metadata in the db
        await setRepositoryItemMetadata({ item, store });
    }

    // insert any collections found on the backend storage not already in the DB
    let collections =
        (await listObjects({ prefix: `/${configuration.api.domain}/repository/collection` })) || [];
    collections = collections.map((item) => ({ identifier: item.id, type: "collection" }));
    for (let collection of collections) {
        await models.repoitem.findOrCreate({
            where: { ...collection, openAccess: true },
            default: { ...collection, openAccess: true },
        });
    }

    return {};
}
