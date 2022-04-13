import models from "../models";
import path from "path";
import {
    BadRequestError,
    ForbiddenError,
    NotFoundError,
    InternalServerError,
} from "restify-errors";
import { route, routeAdmin, logEvent, getLogger, getS3Handle, loadFiles } from "../common";
import { orderBy, groupBy, flattenDeep, compact } from "lodash";
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
    deleteItemResourceFile,
    linkItemToUser,
    getResourceProcessingStatus,
    statItemFile,
    markResourceComplete,
    isResourceComplete,
} from "../lib/item";
const log = getLogger();
import fetch from "node-fetch";

async function verifyItemAccess(req, res, next) {
    let item = await lookupItemByIdentifier({
        identifier: req.params.identifier,
        userId: req.session.user.id,
    });
    if (!item) {
        return next(new ForbiddenError(`You don't have permission to access this endpoint`));
    }
    req.item = item;
    next();
}
function routeItem(handler) {
    return compact(flattenDeep([...route(), verifyItemAccess, handler]));
}

export function setupRoutes({ server }) {
    // user routes
    server.get("/items", route(getItemsHandler));
    server.post("/items", route(createItemHandler));
    server.put("/items/:identifier/attach-user", routeItem(putItemInviteUserHandler));
    server.put("/items/:identifier/detach-user", routeItem(putItemDetachUserHandler));
    server.get("/items/:identifier/users", routeItem(getItemUsers));
    server.del("/items/:identifier", routeItem(deleteItemHandler));
    server.get("/items/:identifier/status", routeItem(getItemStatisticsHandler));
    server.get("/items/:identifier/resources", routeItem(getItemResourcesHandler));
    server.put("/items/:identifier/reprocess-imports", routeItem(putReprocessImports));
    server.get(
        "/items/:identifier/resources/:resource/files",
        routeItem(getResourceFilesListHandler)
    );
    server.get(
        "/items/:identifier/resources/:resource/status",
        routeItem(getResourceProcessingStatusHandler)
    );
    server.put(
        "/items/:identifier/resources/:resource/status",
        routeItem(putResourceCompleteHandler)
    );
    server.get(
        "/items/:identifier/resources/:resource/transcription",
        routeItem(getItemTranscriptionHandler)
    );
    server.get("/items/:identifier/resources/:resource", routeItem(getItemResourceFileHandler));
    server.get(
        "/items/:identifier/resources/:file/link",
        routeItem(getItemResourceFileLinkHandler)
    );
    server.del("/items/:identifier/resources/:resource", routeItem(deleteItemResourceHandler));
    // server.del(
    //     "/items/:identifier/resources/:resource/:file",
    //     routeItem(deleteItemResourceFileHandler)
    // );
    server.put(
        "/items/:identifier/resources/:resource/saveTranscription",
        routeItem(saveItemTranscriptionHandler)
    );

    server.post(
        "/items/:identifier/resources/processing-status",
        routeItem(postResourceProcessingStatus)
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

async function putItemInviteUserHandler(req, res, next) {
    let user = await models.user.findOne({ where: { email: req.params.email } });
    if (!user) {
        return next(new NotFoundError());
    }
    try {
        await linkItemToUser({ itemId: req.item.id, userId: user.id });
        await logEvent({
            level: "info",
            owner: req.session.user.email,
            text: `User '${req.session.user.email}' invited '${user.email}' to '${req.item.identifier}'`,
        });
        res.send({});
        next();
    } catch (error) {
        return next(new InternalServerError());
    }
}

async function putItemDetachUserHandler(req, res, next) {
    let user = await models.user.findOne({ where: { id: req.params.userId } });
    if (user.administrator) {
        return next(new ForbiddenError());
    }
    try {
        await models.item_user.destroy({ where: { userId: req.params.userId } });
        res.send({});
        next();
    } catch (error) {
        return next(new InternalServerError());
    }
}

async function getItemUsers(req, res, next) {
    let itemUsers = await models.item_user.findAll({
        where: { itemId: req.item.id },
    });
    let users = [];
    for (let user of itemUsers) {
        user = await models.user.findOne({
            where: { id: user.userId },
            attributes: ["id", "email", "givenName", "familyName", "administrator"],
            raw: true,
        });
        user.loggedin = req.session.user.id === user.id ? true : false;
        users.push(user);
    }
    res.send({ users });
    next();
}

async function deleteItemHandler(req, res, next) {
    try {
        await deleteItem({ id: req.item.id });
        let { bucket } = await getS3Handle();
        await bucket.removeObjects({ prefix: req.params.identifier });
        await logEvent({
            level: "info",
            owner: req.session.user.email,
            text: `User deleted item '${req.params.identifier}'`,
        });
    } catch (error) {
        log.error(`Error deleting item with id: '${req.params.identifier}'`);
        return next(new InternalServerError());
    }
    res.send({});
    next();
}

async function getItemStatisticsHandler(req, res, next) {
    let { resources, total } = await listItemResources({
        identifier: req.params.identifier,
        groupByResource: true,
    });
    let statistics = { total };
    res.send({ statistics });
    next();
}

async function getResourceProcessingStatusHandler(req, res, next) {
    let completed = {};
    const { identifier, resource } = req.params;

    let files = (await listItemResourceFiles({ identifier, resource })).files;
    if (!files) {
        res.send({ completed: (completed[resource] = {}) });
        return next();
    }

    completed[resource] = {};
    completed[resource].markedComplete = await isResourceComplete({ identifier, resource });
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

async function putResourceCompleteHandler(req, res, next) {
    const { identifier, resource } = req.params;
    await markResourceComplete({ identifier, resource, ...req.query });
    res.send({});
    next();
}

async function getItemResourcesHandler(req, res, next) {
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

async function putReprocessImports(req, res, next) {
    const files = [
        `${req.item.identifier}-tei.xml`,
        `${req.item.identifier}-tei.xml`,
        `${req.item.identifier}-digivol.csv`,
    ];

    let imports = [];
    for (let file of files) {
        let exists = await statItemFile({ identifier: req.item.identifier, file });
        if (exists) imports.push(file);
    }

    res.send({ imports });
    next();
}

async function getResourceFilesListHandler(req, res, next) {
    let { files } = await listItemResourceFiles({
        identifier: req.params.identifier,
        resource: req.params.resource,
    });
    res.send({ files });
    next();
}

async function getItemResourceFileHandler(req, res, next) {
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
        await logEvent({
            level: "info",
            owner: req.session.user.email,
            text: `User deleted resource: '${identifier}/${resource}'`,
        });
    } catch (error) {
        log.error(`Error deleting item resource: '${identifier}/${resource}'`);
        return next(new InternalServerError());
    }
    res.send({});
    next();
}

// async function deleteItemResourceFileHandler(req, res, next) {
//     const { identifier, file } = req.params;
//     try {
//         await deleteItemResourceFile({ identifier, file });
//     } catch (error) {
//         log.error(`Error deleting item file: ${identifier}/${file}`);
//         return next(new InternalServerError());
//     }
//     res.send({});
//     next();
// }

async function getItemTranscriptionHandler(req, res, next) {
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
    try {
        let link = await getItemResourceLink({
            identifier: req.params.identifier,
            resource: req.params.file,
            download: req.query.download,
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

async function postResourceProcessingStatus(req, res, next) {
    let tasks = await getResourceProcessingStatus({
        identifier: req.item.id,
        resources: req.body.resources.map((r) => r.resource),
    });
    tasks = tasks.map((t) => t.get());
    tasks = groupBy(tasks, "resource");
    tasks = Object.keys(tasks).map((r) => tasks[r].shift());
    res.send({ tasks });
    next();
}
