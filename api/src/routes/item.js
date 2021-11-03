import { BadRequestError, ForbiddenError } from "restify-errors";
import { route, logEvent, getLogger } from "../common";
import {
    createItem,
    linkItemToUser,
    lookupItemByIdentifier,
    getItems,
    getItemResources,
    getItemResourceLink,
} from "../lib/item";
const log = getLogger();

export function setupRoutes({ server }) {
    server.get("/items", route(getItemsHandler));
    server.post("/items", route(createItemHandler));
    server.get("/items/:identifier/resources", route(getItemResourcesHandler));
    server.get("/items/:identifier/resources/:resource/link", route(getItemResourceLinkHandler));
}

async function createItemHandler(req, res, next) {
    if (!req.body.identifier) {
        return next(new BadRequestError(`itemId not defined`));
    }
    // is that identifier already in use?
    let item = await lookupItemByIdentifier({
        identifier: req.body.identifier,
    });
    if (!item) {
        // identifier not in use so create the item
        await logEvent({
            level: "info",
            owner: req.session.user.email,
            text: `Creating new item with identifier ${req.body.identifier}`,
        });
        item = await createItem({ identifier: req.body.identifier, userId: req.session.user.id });
    } else {
        // item with that identifier exists but does it belong that user?
        item = await lookupItemByIdentifier({
            identifier: req.body.identifier,
            userId: req.session.user.id,
        });
        if (!item) {
            await logEvent({
                level: "error",
                owner: req.session.user.email,
                text: `Creating new item with identifier ${req.body.identifier} failed. Item belongs to someone else.`,
            });
            return next(new ForbiddenError(`That identifier is already taken`));
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
    if (resources) {
        resources = resources.map((r) => r.Key.split(`${req.params.identifier}/`)[1]);
    } else {
        resources = [];
    }
    res.send({ resources });
    next();
}

async function getItemResourceLinkHandler(req, res, next) {
    let link = await getItemResourceLink({
        identifier: req.params.identifier,
        resource: req.params.resource,
    });
    res.send({ link });
    next();
}
