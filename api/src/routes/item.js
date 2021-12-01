import { BadRequestError, ForbiddenError, NotFoundError } from "restify-errors";
import { route, logEvent, getLogger, loadConfiguration } from "../common";
import {
    createItem,
    lookupItemByIdentifier,
    getItems,
    listItemResources,
    getItemResource,
    getItemResourceLink,
    putItemResource,
} from "../lib/item";
import path from "path";
const log = getLogger();

export function setupRoutes({ server }) {
    server.get("/items", route(getItemsHandler));
    server.post("/items", route(createItemHandler));
    server.get("/items/:identifier/status", route(getItemProcessingStatusHandler));
    server.get("/items/:identifier/resources", route(getItemResourcesHandler));
    server.get("/items/:identifier/resources/:resource", route(getItemResourceHandler));
    server.get("/items/:identifier/resources/:resource/link", route(getItemResourceLinkHandler));
    server.put(
        "/items/:identifier/resources/:resource/saveTranscription",
        route(saveItemTranscriptionHandler)
    );
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

async function getItemProcessingStatusHandler(req, res, next) {
    const configuration = await loadConfiguration();
    let { resources } = await listItemResources({ identifier: req.params.identifier });
    if (resources) {
        resources = resources.map((r) => r.Key.split(`${req.params.identifier}/`)[1]);
    }
    let completed = {};
    for (let stage of configuration.api.processing.requiredStages) {
        switch (stage) {
            case "thumbnails":
                completed.thumbnails = resources.filter((r) => r.match("thumbnail")).length
                    ? true
                    : false;
            case "webformats":
                let jpeg = resources.filter((r) => r.match(/\.jpe?g/)).length ? true : false;
                let webp = resources.filter((r) => r.match(/\.webp/)).length ? true : false;
                // let avif = resources.filter((r) => r.match(/\.avif/)).length ? true : false;
                completed.webformats = jpeg && webp ? true : false;
            case "ocr":
                completed.ocr =
                    resources.filter((r) => r.match(/.tesseract_ocr/)).length === 2 ? true : false;
        }
    }
    res.send(completed);
    next();
}

async function getItemResourcesHandler(req, res, next) {
    let { resources } = await listItemResources({ identifier: req.params.identifier });
    if (resources) {
        resources = resources.map((r) => r.Key.split(`${req.params.identifier}/`)[1]);
    } else {
        resources = [];
    }
    res.send({ resources });
    next();
}

async function getItemResourceHandler(req, res, next) {
    try {
        let content = await getItemResource({
            identifier: req.params.identifier,
            resource: req.params.resource,
        });
        res.send({ content });
        next();
    } catch (error) {
        return next(new NotFoundError());
    }
}

async function getItemResourceLinkHandler(req, res, next) {
    try {
        let link = await getItemResourceLink({
            identifier: req.params.identifier,
            resource: req.params.resource,
        });
        res.send({ link });
        next();
    } catch (error) {
        return next(new NotFoundError());
    }
}

async function saveItemTranscriptionHandler(req, res, next) {
    const { identifier, resource, datafiles, document } = req.params;
    let file = `${resource}.tei.xml`;
    await putItemResource({ identifier, resource: file, content: document });
    res.send({});
    next();
}
