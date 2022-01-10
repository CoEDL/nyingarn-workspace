import {
    BadRequestError,
    ForbiddenError,
    NotFoundError,
    InternalServerError,
} from "restify-errors";
import { route, logEvent, getLogger, getS3Handle } from "../common";
import {
    createItem,
    lookupItemByIdentifier,
    getItems,
    listItemResources,
    getItemResource,
    getItemResourceLink,
    putItemResource,
    itemResourceExists,
    deleteItem,
    deleteItemResource,
} from "../lib/item";
import path from "path";
const log = getLogger();

export function setupRoutes({ server }) {
    server.get("/items", route(getItemsHandler));
    server.post("/items", route(createItemHandler));
    server.del("/items/:identifier", route(deleteItemHandler));
    server.get("/items/:identifier/status", route(getItemStatisticsHandler));
    server.get("/items/:identifier/resources", route(getItemResourcesHandler));
    server.get(
        "/items/:identifier/resources/:resource/status",
        route(getResourceProcessingStatusHandler)
    );
    server.get(
        "/items/:identifier/resources/:resource/transcription",
        route(getItemTranscriptionHandler)
    );
    server.get("/items/:identifier/resources/:resource", route(getItemResourceHandler));
    server.del("/items/:identifier/resources/:resource", route(deleteItemResourceHandler));
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

async function deleteItemHandler(req, res, next) {
    let item = await lookupItemByIdentifier({
        identifier: req.params.identifier,
        userId: req.session.user.id,
    });
    if (!item) {
        return next(new ForbiddenError(`You don't have permission to delete that item`));
    }
    try {
        await deleteItem({ id: item.id });
        let { bucket } = await getS3Handle();
        await bucket.removeObjects({ prefix: req.params.identifier });
    } catch (error) {
        log.error(`Error deleting item with id: ${req.params.identifier}`);
        console.error(error);
        return next(new InternalServerError());
    }
    res.send({});
    next();
}

async function getItemStatisticsHandler(req, res, next) {
    let { resources } = await listItemResources({
        identifier: req.params.identifier,
        groupByResource: true,
    });
    let statistics = {
        resourceTotal: Object.keys(resources).length,
    };
    res.send({ statistics });
    next();
}

async function getResourceProcessingStatusHandler(req, res, next) {
    let completed = {};
    const identifier = req.params.identifier;
    const resource = req.params.resource.split(".").shift().split("-").pop();
    let { resources } = await listItemResources({
        identifier,
        groupByResource: true,
    });
    let files = resources[resource];

    completed[resource] = {};
    completed[resource].thumbnail = files.filter((f) => f.name.match(/thumbnail/)).length
        ? true
        : false;
    completed[resource].webformats = (() => {
        let jpeg = files.filter((f) => f.name.match(/\.jpe?g/)).length ? true : false;
        let webp = files.filter((f) => f.name.match(/\.webp/)).length ? true : false;
        return jpeg && webp ? true : false;
    })();
    completed[resource].tesseract =
        files.filter((f) => f.name.match(/\.tesseract_ocr/)).length === 2 ? true : false;
    completed[resource].tei =
        files.filter((f) => f.name.match(/\.tei\.xml/)).length === 1 ? true : false;
    res.send({ completed: completed[resource] });
    next();
}

async function getItemResourcesHandler(req, res, next) {
    let { resources } = await listItemResources({ identifier: req.params.identifier });
    if (!resources) {
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

async function deleteItemResourceHandler(req, res, next) {
    const { identifier, resource } = req.params;
    try {
        await deleteItemResource({ identifier, resource });
    } catch (error) {
        log.error(`Error deleting item resource: ${identifier}/${resource}`);
        console.error(error);
        return next(new InternalServerError());
    }
    res.send({});
    next();
}

async function getItemTranscriptionHandler(req, res, next) {
    let masterTranscription = `${req.params.resource}.tei.xml`;
    let tesseractTranscription = `${req.params.resource}.tesseract_ocr-ADMIN.txt`;

    let content;
    let resource = masterTranscription;
    let exists = await itemResourceExists({
        identifier: req.params.identifier,
        resource,
    });
    if (exists) {
        content = await getItemResource({
            identifier: req.params.identifier,
            resource,
        });
    } else {
        resource = tesseractTranscription;
        exists = await itemResourceExists({
            identifier: req.params.identifier,
            resource,
        });

        if (exists) {
            content = await getItemResource({
                identifier: req.params.identifier,
                resource,
            });
        } else {
            content = "";
        }
    }

    try {
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
