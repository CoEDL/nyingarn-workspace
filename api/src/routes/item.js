import models from "../models/index.js";
import {
    logEvent,
    getLogger,
    getStoreHandle,
    demandAuthenticatedUser,
    requireItemAccess,
} from "../common/index.js";
import lodashPkg from "lodash";
const { groupBy, isEmpty } = lodashPkg;
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
    statItemFile,
    markResourceComplete,
    isResourceComplete,
} from "../lib/item.js";
import { transformDocument } from "../lib/transform.js";
const log = getLogger();

export function setupRoutes(fastify, options, done) {
    fastify.addHook("preHandler", demandAuthenticatedUser);

    // user routes
    fastify.get("/items", getItemsHandler);
    fastify.post("/items", postItemHandler);

    // user routes - access specific item
    fastify.register((fastify, options, done) => {
        fastify.addHook("preHandler", requireItemAccess);

        fastify.get("/items/:identifier", getItemHandler);
        fastify.put("/items/:identifier/attach-user", putItemInviteUserHandler);
        fastify.put("/items/:identifier/detach-user", putItemDetachUserHandler);
        fastify.get("/items/:identifier/users", getItemUsers);
        fastify.delete("/items/:identifier", deleteItemHandler);
        fastify.get("/items/:identifier/status", getItemStatisticsHandler);
        fastify.get("/items/:identifier/resources", getItemResourcesHandler);
        fastify.put("/items/:identifier/reprocess-imports", putReprocessImports);
        fastify.get("/items/:identifier/resources/:resource/files", getResourceFilesListHandler);
        fastify.get(
            "/items/:identifier/resources/:resource/status",
            getResourceProcessingStatusHandler
        );
        fastify.put("/items/:identifier/resources/:resource/status", putResourceCompleteHandler);
        fastify.get(
            "/items/:identifier/resources/:resource/transcription",
            getItemTranscriptionHandler
        );
        fastify.get(
            "/items/:identifier/resources/:resource/transform",
            getTransformTeiDocumentHandler
        );
        fastify.get("/items/:identifier/resources/:resource", getItemResourceFileHandler);
        fastify.get("/items/:identifier/resources/:file/link", getItemResourceFileLinkHandler);
        fastify.delete("/items/:identifier/resources/:resource", deleteItemResourceHandler);
        // fastify.delete(
        //     "/items/:identifier/resources/:resource/:file",
        //     deleteItemResourceFileHandler
        // );
        fastify.put(
            "/items/:identifier/resources/:resource/saveTranscription",
            saveItemTranscriptionHandler
        );
        fastify.post(
            "/items/:identifier/resources/processing-status",
            postResourceProcessingStatus
        );
        done();
    });
    done();
}

async function getItemsHandler(req) {
    const userId = req.session.user.id;
    const offset = req.query.offset;
    const limit = req.query.limit;
    const match = req.query.match;
    const publicationStatus = req.query.publicationStatus;
    let { count, rows } = await getItems({ userId, offset, limit, match, publicationStatus });
    let items = rows.map((i) => ({
        identifier: i.identifier,
        type: "item",
        publicationStatus: i.publicationStatus,
        collections: groupBy(
            i.collections.map((c) => ({
                type: "collection",
                identifier: c.identifier,
            })),
            "identifier"
        ),
    }));
    return { total: count, items };
}

async function getItemHandler(req) {
    return { item: req.session.item.get() };
}

async function postItemHandler(req, res) {
    if (!req.body.identifier) {
        return res.badRequest(`itemId not defined`);
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
            return res.forbidden(`That identifier is already taken`);
        }
    }

    return { item: item.get() };
}

async function putItemInviteUserHandler(req, res) {
    let user = await models.user.findOne({ where: { email: req.body.email } });
    if (!user) {
        return res.notFound();
    }
    try {
        await linkItemToUser({ itemId: req.session.item.id, userId: user.id });
        await logEvent({
            level: "info",
            owner: req.session.user.email,
            text: `User '${req.session.user.email}' invited '${user.email}' to '${req.session.item.identifier}'`,
        });
        return {};
    } catch (error) {
        return res.internalServerError();
    }
}

async function putItemDetachUserHandler(req, res) {
    let user = await models.user.findOne({ where: { id: req.body.userId } });
    try {
        await req.session.item.removeUser([user]);
        return {};
    } catch (error) {
        return res.internalServerError();
    }
}

async function getItemUsers(req) {
    let users = await req.session.item.getUsers();
    users = users.map((u) => {
        return {
            id: u.id,
            email: u.email,
            givenName: u.givenName,
            familyName: u.familyName,
            administrator: u.administrator,
            loggedin: req.session.user.id === u.id ? true : false,
        };
    });
    return { users };
}

async function deleteItemHandler(req, res) {
    try {
        await deleteItem({ id: req.session.item.id });
        let store = await getStoreHandle({ id: req.params.identifier, type: "item" });
        await store.removeObject();
        await logEvent({
            level: "info",
            owner: req.session.user.email,
            text: `User deleted item '${req.params.identifier}'`,
        });
    } catch (error) {
        log.error(`Error deleting item with id: '${req.params.identifier}'`);
        return res.internalServerError();
    }
    return {};
}

async function getItemStatisticsHandler(req) {
    let { resources, total } = await listItemResources({
        identifier: req.params.identifier,
        groupByResource: true,
    });
    let statistics = { total };
    return { statistics };
}

async function getResourceProcessingStatusHandler(req) {
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
    return { completed: completed[resource] };
}

async function putResourceCompleteHandler(req) {
    const { identifier, resource } = req.params;
    await markResourceComplete({ identifier, resource, ...req.query });
    return {};
}

async function getItemResourcesHandler(req) {
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
    return { resources, total };
}

async function putReprocessImports(req) {
    const { identifier } = req.params;
    const files = [
        `${req.item.identifier}-tei.xml`,
        `${req.item.identifier}-tei.xml`,
        `${req.item.identifier}-digivol.csv`,
    ];

    let imports = [];
    for (let file of files) {
        let exists = await statItemFile({ identifier, file });
        if (exists) imports.push(file);
    }

    return { imports };
}

async function getResourceFilesListHandler(req) {
    let { files } = await listItemResourceFiles({
        identifier: req.params.identifier,
        resource: req.params.resource,
    });
    return { files };
}

async function getItemResourceFileHandler(req, res) {
    try {
        let content = await getItemResource({
            identifier: req.params.identifier,
            resource: req.params.resource,
        });
        return { content };
    } catch (error) {
        return res.notFound();
    }
}

async function deleteItemResourceHandler(req, res) {
    const { identifier, resource } = req.params;
    try {
        await deleteItemResource({ identifier, resource });
        await logEvent({
            level: "info",
            owner: req.session.user.email,
            text: `User deleted resource: '${identifier}/${resource}'`,
        });
        return {};
    } catch (error) {
        log.error(`Error deleting item resource: '${identifier}/${resource}'`);
        return res.internalServerError();
    }
}

async function getItemTranscriptionHandler(req) {
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

        return { content };
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
        return { content };
    }

    return { content: "" };
}

async function getItemResourceFileLinkHandler(req, res) {
    try {
        let link = await getItemResourceLink({
            identifier: req.params.identifier,
            resource: req.params.file,
            download: req.query.download,
        });
        return { link };
    } catch (error) {
        return res.notFound();
    }
}

async function saveItemTranscriptionHandler(req, res) {
    const { identifier, resource } = req.params;
    let { datafiles, document } = req.body;
    let file = `${resource}.tei.xml`;
    try {
        if (!isEmpty(document)) {
            await putItemResource({ identifier, resource: file, content: document });
        }
        return {};
    } catch (error) {
        log.error(`Error saving transcription: ${error.message}`);
        return res.internalServerError();
    }
}

async function postResourceProcessingStatus(req) {
    let tasks = await getResourceProcessingStatus({
        itemId: req.session.item.id,
        resources: req.body.resources.map((r) => r.resource),
        dateFrom: req.body.dateFrom,
    });
    tasks = tasks.map((t) => t.get());
    tasks = groupBy(tasks, "resource");
    tasks = Object.keys(tasks).map((r) => tasks[r].shift());
    return { tasks };
}
// TODO: this method does not have tests
async function getTransformTeiDocumentHandler(req) {
    const { identifier, resource } = req.params;
    let store = await getStoreHandle({ id: identifier, type: "item" });
    let document = await store.get({ target: `${resource}.tei.xml` });
    document = await transformDocument({ document });
    return { document };
}
