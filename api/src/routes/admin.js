import {
    listObjects,
    loadConfiguration,
    demandAdministrator,
    demandAuthenticatedUser,
} from "../common/index.js";
import { createItem, lookupItemByIdentifier, linkItemToUser, getItems } from "../lib/item.js";
import {
    createCollection,
    lookupCollectionByIdentifier,
    linkCollectionToUser,
    getCollections,
} from "../lib/collection.js";

export function setupRoutes(fastify, options, done) {
    fastify.addHook("preHandler", demandAuthenticatedUser);
    fastify.addHook("preHandler", demandAdministrator);

    fastify.get("/admin", async (req, res) => {});
    fastify.get("/admin/entries", getAdminEntriesHandler);
    fastify.put("/admin/items/:identifier/connect-user", putAdminItemUserHandler);
    fastify.put("/admin/collections/:identifier/connect-user", putAdminCollectionUserHandler);
    done();
}

async function getAdminEntriesHandler(req) {
    const configuration = await loadConfiguration();

    const myItems = (await getItems({ userId: req.session.user.id, limit: undefined })).rows.map(
        (item) => item.identifier
    );
    let items = (await listObjects({ prefix: `/${configuration.api.domain}/item` })) || [];
    items = items.map((i) => ({ name: i, connected: myItems.includes(i) }));

    const myCollections = (
        await getCollections({ userId: req.session.user.id, limit: undefined })
    ).rows.map((collection) => collection.identifier);
    let collections =
        (await listObjects({ prefix: `/${configuration.api.domain}/collection` })) || [];
    collections = collections.map((c) => ({ name: c, connected: myCollections.includes(c) }));

    return { items, collections };
}

// TODO: this code does not have tests
async function putAdminItemUserHandler(req) {
    let item = await lookupItemByIdentifier({ identifier: req.params.identifier });
    if (item) {
        await linkItemToUser({ itemId: item.id, userId: req.session.user.id });
    } else {
        item = await createItem({ identifier: req.params.identifier, userId: req.session.user.id });
    }
    return {};
}

// TODO: this code does not have tests
async function putAdminCollectionUserHandler(req) {
    let collection = await lookupCollectionByIdentifier({ identifier: req.params.identifier });
    if (collection) {
        await linkCollectionToUser({ collectionId: collection.id, userId: req.session.user.id });
    } else {
        collection = await createCollection({
            identifier: req.params.identifier,
            userId: req.session.user.id,
        });
    }
    return {};
}
