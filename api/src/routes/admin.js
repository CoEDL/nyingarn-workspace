import path from "path";
import { routeAdmin, loadFiles, listObjects, getLogger, loadConfiguration } from "../common";
import { groupBy } from "lodash";
import { createItem, lookupItemByIdentifier, linkItemToUser } from "../lib/item";
import {
    createCollection,
    lookupCollectionByIdentifier,
    linkCollectionToUser,
} from "../lib/collection";
const log = getLogger();

export function setupRoutes({ server }) {
    server.get("/admin/entries", routeAdmin(getAdminEntriesHandler));
    server.put("/admin/items/:identifier/connect-user", routeAdmin(putAdminItemUserHandler));
    server.put(
        "/admin/collections/:identifier/connect-user",
        routeAdmin(putAdminCollectionUserHandler)
    );
}

async function getAdminEntriesHandler(req, res, next) {
    const configuration = await loadConfiguration();

    let items = (await listObjects({ prefix: `/${configuration.api.domain}/item` })) || [];
    let collections =
        (await listObjects({ prefix: `/${configuration.api.domain}/collection` })) || [];
    items = items.map((i) => ({ name: i }));
    collections = collections.map((c) => ({ name: c }));
    res.send({ items, collections });
    next();
}

async function putAdminItemUserHandler(req, res, next) {
    let item = await lookupItemByIdentifier({ identifier: req.params.identifier });
    if (item) {
        await linkItemToUser({ itemId: item.id, userId: req.session.user.id });
    } else {
        item = await createItem({ identifier: req.params.identifier, userId: req.session.user.id });
    }
    res.send({});
    next();
}

async function putAdminCollectionUserHandler(req, res, next) {
    let collection = await lookupCollectionByIdentifier({ identifier: req.params.identifier });
    if (collection) {
        await linkCollectionToUser({ collectionId: collection.id, userId: req.session.user.id });
    } else {
        collection = await createCollection({
            identifier: req.params.identifier,
            userId: req.session.user.id,
        });
    }
    res.send({});
    next();
}
