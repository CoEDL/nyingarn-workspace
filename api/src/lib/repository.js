import { listObjects, getStoreHandle, loadConfiguration } from "../common/index.js";
import models from "../models/index.js";
import { Op, fn as seqFn, col as seqCol } from "sequelize";

import { Client } from "@elastic/elasticsearch";
import { ROCrate } from "ro-crate";

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

export async function indexRepositoryItem({ item, crate }) {
    let configuration = await loadConfiguration();
    crate = new ROCrate(crate, { array: true, link: true });
    let document = crate.getTree({ valueObject: false });
    const indexIdentifier = `/${item.type}/${item.identifier}`;

    const client = new Client({
        node: configuration.api.services.elastic.host,
    });
    try {
        await client.indices.get({ index: "metadata" });
    } catch (error) {
        await client.indices.create({ index: "metadata" });
    }
    await client.index({
        index: "metadata",
        id: indexIdentifier,
        document,
    });

    // for (let entity of crate.entities()) {
    //     console.log(entity);
    // }
}
