import { BadRequestError, ConflictError } from "restify-errors";
import { loadConfiguration } from "../common";
import { route } from "../middleware";
import {
    createItem,
    linkItemToUser,
    lookupItemByIdentifier,
    getItems,
    getItemResources,
} from "../lib/item";

export function setupRoutes({ server }) {
    server.get("/items", route(getItemsHandler));
    server.post("/items", route(createItemHandler));
    server.get("/items/:identifier/resources", route(getItemResourcesHandler));
}

async function createItemHandler(req, res, next) {
    if (!req.body.identifier) {
        return next(new BadRequestError(`itemId not defined`));
    }
    // is that identifier already in use?
    let item = await lookupItemByIdentifier({ identifier: req.body.identifier });
    if (!item) {
        // no - create the item
        item = await createItem({ identifier: req.body.identifier });

        // and link the item to the user
        await linkItemToUser({ itemId: item.id, userId: req.session.user.id });
    } else {
        // the identifier is already taken
        let users = item.users.map((u) => u.id);
        if (!users.includes(req.session.user.id)) {
            // the item exists but does not belong to the user
            return next(new ConflictError(`That identifier is taken`));
        }
    }

    res.send({ item: item.get() });
    next();
}

async function getItemsHandler(req, res, next) {
    const userId = req.session.user.id;
    const offset = req.query.offset;
    const limit = req.query.limit;
    let { count, rows } = await getItems({ userId, offset, limit });
    let items = rows.map((i) => i.identifier);

    res.send({ total: count, items });
    next();
}

async function getItemResourcesHandler(req, res, next) {
    let { resources } = await getItemResources({ identifier: req.params.identifier });
    resources = resources.map((r) => r.Key.split(`${req.params.identifier}/`)[1]);
    res.send({ resources });
    next();
}
