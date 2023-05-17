import {
    demandAdministrator,
    demandAuthenticatedUser,
    getLogger,
    getStoreHandle,
} from "../common/index.js";
import { getRepositoryItems, indexRepositoryItem } from "../lib/repository.js";
import models from "../models/index.js";

const log = getLogger();

export function setupRoutes(fastify, options, done) {
    fastify.addHook("preHandler", demandAuthenticatedUser);

    fastify.register((fastify, options, done) => {
        fastify.addHook("preHandler", demandAdministrator);
        fastify.get("/repository/lookup-content", getRepositoryLookupContentHandler);
        fastify.get("/repository/index-all-content", indexAllRepositoryContentHandler);
        fastify.get("/repository/index/:id", indexRepositoryItemHandler);
        done();
    });
    done();
}

async function getRepositoryLookupContentHandler(req) {
    let { prefix, offset } = req.query;
    let { items, total } = await getRepositoryItems({ user: req.session.user, prefix, offset });
    return { items, total };
}

async function indexRepositoryItemHandler(req) {
    let { id } = req.params;
    const item = await models.repoitem.findOne({ where: { id } });

    let store = await getStoreHandle({
        identifier: item.identifier,
        type: item.type,
        location: "repository",
    });
    let crate = await store.getJSON({ target: "ro-crate-metadata.json" });

    // index the specified item
    await indexRepositoryItem({ item, crate });

    return {};
}

async function indexAllRepositoryContentHandler(req) {
    let itemsIndexed = 0;
    await indexItems(itemsIndexed);

    async function indexItems(itemsIndexed) {
        let { items, total } = await getRepositoryItems({
            user: req.session.user,
            offset: itemsIndexed,
        });

        for (let item of items) {
            let store = await getStoreHandle({
                identifier: item.identifier,
                type: item.type,
                location: "repository",
            });
            let crate = await store.getJSON({ target: "ro-crate-metadata.json" });
            await indexRepositoryItem({ item, crate });
            itemsIndexed += 1;
        }
        if (itemsIndexed < total) await indexItems(itemsIndexed);
    }
    return {};
}
