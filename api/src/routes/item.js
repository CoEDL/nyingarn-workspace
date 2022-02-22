import {
    BadRequestError,
    ForbiddenError,
    NotFoundError,
    InternalServerError,
} from "restify-errors";
import { route, routeAdmin, logEvent, getLogger, getS3Handle } from "../common";
import { orderBy, groupBy } from "lodash";
import {
    createItem,
    lookupItemByIdentifier,
    getItems,
    listItemResources,
    getItemResource,
    getItemResourceLink,
    putItemResource,
    itemResourceExists,
    listItemResourceFiles,
    deleteItem,
    deleteItemResource,
    linkItemToUser,
    getResourceProcessingStatus,
} from "../lib/item";
import path from "path";
const log = getLogger();

export function setupRoutes({ server }) {
    // user routes
    server.get("/items", route(getItemsHandler));
    server.post("/items", route(createItemHandler));
    server.del("/items/:identifier", route(deleteItemHandler));
    server.get("/items/:identifier/status", route(getItemStatisticsHandler));
    server.get("/items/:identifier/resources", route(getItemResourcesHandler));
    server.get("/items/:identifier/resources/:resource/files", route(getResourceFilesListHandler));
    server.get(
        "/items/:identifier/resources/:resource/status",
        route(getResourceProcessingStatusHandler)
    );
    server.get(
        "/items/:identifier/resources/:resource/transcription",
        route(getItemTranscriptionHandler)
    );
    server.get("/items/:identifier/resources/:resource", route(getItemResourceFileHandler));
    server.get("/items/:identifier/resources/:file/link", route(getItemResourceFileLinkHandler));
    server.del("/items/:identifier/resources/:resource", route(deleteItemResourceHandler));
    server.put(
        "/items/:identifier/resources/:resource/saveTranscription",
        route(saveItemTranscriptionHandler)
    );

    server.post(
        "/items/:identifier/resources/processing-status",
        route(postResourceProcessingStatus)
    );

    // admin routes
    server.get("/admin/items", routeAdmin(getAdminItemsHandler));
    server.put("/admin/items/:identifier/connect-user", routeAdmin(putAdminItemUserHandler));
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
    let item = await lookupItemByIdentifier({
        identifier: req.params.identifier,
        userId: req.session.user.id,
    });
    if (!item) {
        return next(new ForbiddenError(`You don't have permission to access this endpoint`));
    }
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
    let item = await lookupItemByIdentifier({
        identifier: req.params.identifier,
        userId: req.session.user.id,
    });
    if (!item) {
        return next(new ForbiddenError(`You don't have permission to access this endpoint`));
    }
    let completed = {};
    const identifier = req.params.identifier;
    const resource = req.params.resource;
    let files = (await listItemResourceFiles({ identifier, resource })).files;
    if (!files) {
        res.send({ completed: (completed[resource] = {}) });
        return next();
    }

    completed[resource] = {};
    completed[resource].thumbnail = files.filter((f) => f.match(/thumbnail/)).length ? true : false;
    completed[resource].webformats = (() => {
        let jpeg = files.filter((f) => f.match(/\.jpe?g/)).length ? true : false;
        let webp = files.filter((f) => f.match(/\.webp/)).length ? true : false;
        return jpeg && webp ? true : false;
    })();
    completed[resource].tesseract =
        files.filter((f) => f.match(/\.tesseract_ocr/)).length === 2 ? true : false;
    completed[resource].textract =
        files.filter((f) => f.match(/\.textract_ocr/)).length === 1 ? true : false;
    completed[resource].tei =
        files.filter((f) => f.match(/\.tei\.xml/)).length === 1 ? true : false;
    res.send({ completed: completed[resource] });
    next();
}

async function getItemResourcesHandler(req, res, next) {
    let item = await lookupItemByIdentifier({
        identifier: req.params.identifier,
        userId: req.session.user.id,
    });
    if (!item) {
        return next(new ForbiddenError(`You don't have permission to access this endpoint`));
    }

    let query = {
        identifier: req.params.identifier,
    };
    if (req.query.offset) query.offset = parseInt(req.query.offset);
    if (req.query.limit) query.limit = parseInt(req.query.limit);
    let { resources, total } = await listItemResources(query);
    if (!resources) {
        resources = [];
        total = 0;
    }
    res.send({ resources, total });
    next();
}

async function getResourceFilesListHandler(req, res, next) {
    let item = await lookupItemByIdentifier({
        identifier: req.params.identifier,
        userId: req.session.user.id,
    });
    if (!item) {
        return next(new ForbiddenError(`You don't have permission to access this endpoint`));
    }
    let { files } = await listItemResourceFiles({
        identifier: req.params.identifier,
        resource: req.params.resource,
    });
    res.send({ files });
    next();
}

async function getItemResourceFileHandler(req, res, next) {
    let item = await lookupItemByIdentifier({
        identifier: req.params.identifier,
        userId: req.session.user.id,
    });
    if (!item) {
        return next(new ForbiddenError(`You don't have permission to access this endpoint`));
    }
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
    let item = await lookupItemByIdentifier({
        identifier: req.params.identifier,
        userId: req.session.user.id,
    });
    if (!item) {
        return next(new ForbiddenError(`You don't have permission to access this endpoint`));
    }
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
    let item = await lookupItemByIdentifier({
        identifier: req.params.identifier,
        userId: req.session.user.id,
    });
    if (!item) {
        return next(new ForbiddenError(`You don't have permission to access this endpoint`));
    }
    let content;
    let exists = await itemResourceExists({
        identifier: req.params.identifier,
        resource: `${req.params.resource}.tei.xml`,
    });
    // try to get the master transcription
    if (exists) {
        content = await getItemResource({
            identifier: req.params.identifier,
            resource: `${req.params.resource}.tei.xml`,
        });

        res.send({ content });
        return next();
    }

    // otherwise try to get the textract transcription
    exists = await itemResourceExists({
        identifier: req.params.identifier,
        resource: `${req.params.resource}.textract_ocr-ADMIN.json`,
    });
    if (exists) {
        content = await getItemResource({
            identifier: req.params.identifier,
            resource: `${req.params.resource}.textract_ocr-ADMIN.json`,
        });
        content = JSON.parse(content)
            .Blocks.filter((b) => b.BlockType === "LINE")
            .map((b) => b.Text)
            .join("\n");
        res.send({ content });
        return next();
    }

    // otherwise try to get the tesseract transcription
    exists = await itemResourceExists({
        identifier: req.params.identifier,
        resource: `${req.params.resource}.tesseract_ocr-ADMIN.txt`,
    });
    if (exists) {
        content = await getItemResource({
            identifier: req.params.identifier,
            resource: `${req.params.resource}.tesseract_ocr-ADMIN.txt`,
        });
        res.send({ content });
        return next();
    }

    res.send({ content: "" });
    return next();
}

async function getItemResourceFileLinkHandler(req, res, next) {
    let item = await lookupItemByIdentifier({
        identifier: req.params.identifier,
        userId: req.session.user.id,
    });
    if (!item) {
        return next(new ForbiddenError(`You don't have permission to access this endpoint`));
    }
    try {
        let link = await getItemResourceLink({
            identifier: req.params.identifier,
            resource: req.params.file,
        });
        res.send({ link });
        next();
    } catch (error) {
        return next(new NotFoundError());
    }
}

async function saveItemTranscriptionHandler(req, res, next) {
    let item = await lookupItemByIdentifier({
        identifier: req.params.identifier,
        userId: req.session.user.id,
    });
    if (!item) {
        return next(new ForbiddenError(`You don't have permission to access this endpoint`));
    }
    const { identifier, resource, datafiles, document } = req.params;
    let file = `${resource}.tei.xml`;
    await putItemResource({ identifier, resource: file, content: document });
    res.send({});
    next();
}

async function postResourceProcessingStatus(req, res, next) {
    let item = await lookupItemByIdentifier({
        identifier: req.params.identifier,
        userId: req.session.user.id,
    });
    if (!item) {
        return next(new ForbiddenError(`You don't have permission to access this endpoint`));
    }
    let tasks = await getResourceProcessingStatus({
        identifier: item.id,
        resources: req.body.resources.map((r) => r.resource),
    });
    tasks = tasks.map((t) => t.get());
    tasks = groupBy(tasks, "resource");
    tasks = Object.keys(tasks).map((r) => tasks[r].shift());
    res.send({ tasks });
    next();
}

// admin route handlers
async function getAdminItemsHandler(req, res, next) {
    let items = [];
    let { bucket } = await getS3Handle();

    let resources = await loadItems({});
    items = resources
        .filter((r) => r.Key.match("ro-crate-metadata.json"))
        .map((r) => ({ name: r.Key.split("/").shift() }));
    items = orderBy(items, "name");
    res.send({ items });
    next();

    async function loadItems({ continuationToken }) {
        let resources = await bucket.listObjects({ continuationToken });
        if (resources.NextContinuationToken) {
            return [
                ...resources.Contents,
                ...(await loadItems({ continuationToken: resources.NextContinuationToken })),
            ];
        } else {
            return resources.Contents;
        }
    }
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
