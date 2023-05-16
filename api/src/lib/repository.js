import { listObjects, getStoreHandle } from "../common/index.js";
import models from "../models/index.js";
import { Op, fn as seqFn, col as seqCol } from "sequelize";

import { Client } from "@elastic/elasticsearch";

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
        await models.repoitem.findOrCreate({
            where: { ...item },
            default: { ...item },
        });
    }

    // insert any collections found on the backend storage not already in the DB
    let collections =
        (await listObjects({ prefix: `/${configuration.api.domain}/repository/collection` })) || [];
    collections = collections.map((item) => ({ identifier: item.id, type: "collection" }));
    for (let collection of collections) {
        await models.repoitem.findOrCreate({
            where: { ...collection },
            default: { ...collection },
        });
    }

    return {};
}

export async function indexRepositoryItem({ user, configuration, id }) {
    if (!user.administrator) {
        throw new Error(`User must be an admin`);
    }

    let item = await models.repoitem.findOne({ where: { id } });
    console.log(item.get());

    let store = await getStoreHandle({
        identifier: item.identifier,
        type: item.type,
        location: "repository",
    });
    let metadata = await store.getJSON({ target: "ro-crate-metadata.json" });
    // console.log(metadata);

    const client = new Client({
        node: configuration.api.services.elastic.host,
    });
    console.log(client);
}
