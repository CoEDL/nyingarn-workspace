import models from "../models/index.js";
import { Op, fn as seqFn, col as seqCol } from "sequelize";
import {
    loadConfiguration,
    getS3Handle,
    getStoreHandle,
    resourceStatusFile,
    specialFiles,
    imageExtensions,
} from "../common/index.js";
import { transformDocument } from "../lib/transform.js";
import path from "path";
import lodashPkg from "lodash";
const { compact, groupBy, uniq, isNumber } = lodashPkg;

export async function lookupItemByIdentifier({ identifier, userId }) {
    let clause = {
        where: { identifier },
    };
    if (userId) {
        clause.include = [
            { model: models.user, where: { id: userId }, attributes: ["id", "email"], raw: true },
        ];
    } else {
        clause.include = [{ model: models.user, attributes: ["id", "email"], raw: true }];
    }
    return await models.item.findOne(clause);
}

export async function getItems({ userId, offset = 0, limit = 10, match, publicationStatus }) {
    const query = {
        order: [[seqFn("lower", seqCol("item.identifier")), "ASC"]],
    };
    let include = [{ model: models.collection }];
    if (userId) include.push({ model: models.user, where: { id: userId } });
    if (limit) {
        query.offset = offset;
        query.limit = limit;
    }
    query.where = {};
    if (match) {
        query.where.identifier = {
            [Op.iLike]: `%${match}%`,
        };
    }
    if (publicationStatus) {
        query.where.publicationStatus = publicationStatus;
    }
    query.include = include;

    return await models.item.findAndCountAll(query);
}

export async function createItem({ identifier, userId }) {
    let item = await models.item.findOne({ where: { identifier } });
    if (item) {
        throw new Error("An item with that identifier already exists.");
    }
    let collection = await models.collection.findOne({ where: { identifier } });
    if (collection) {
        throw new Error("The item identifier clashes with a collection identifier.");
    }

    item = await models.item.create({ identifier });
    await linkItemToUser({ itemId: item.id, userId });
    await createItemLocationInObjectStore({ identifier });
    return item;
}

export async function deleteItem({ id }) {
    await models.item.destroy({ where: { id } });
}

export async function linkItemToUser({ itemId, userId }) {
    let item = await models.item.findOne({ where: { id: itemId } });
    let user = await models.user.findOne({ where: { id: userId } });
    await user.addItems([item]);
}

export async function createItemLocationInObjectStore({ identifier }) {
    let store = await getStoreHandle({ id: identifier, type: "item" });
    let exists = await store.exists();
    if (!exists) {
        await store.createObject();
        await store.put({
            target: resourceStatusFile,
            json: { item: {}, resources: {} },
            registerFile: false,
        });
    }
}

export async function itemResourceExists({ identifier, resource }) {
    let store = await getStoreHandle({ id: identifier, type: "item" });
    if (!(await store.exists())) {
        throw new Error(`Item with identifier '${identifier}' does not exist in the store`);
    }
    let stat = await store.stat({ path: resource });

    return stat;
}

export async function getItemResource({ identifier, resource }) {
    let store = await getStoreHandle({ id: identifier, type: "item" });
    if (!(await store.exists())) {
        throw new Error(`Item with identifier '${identifier}' does not exist in the store`);
    }
    if (!(await store.fileExists({ path: resource }))) {
        throw new Error(`Not found`);
    } else {
        return await store.get({ target: resource });
    }
}

export async function deleteItemResource({ identifier, resource }) {
    let store = await getStoreHandle({ id: identifier, type: "item" });
    if (!(await store.exists())) {
        throw new Error(`Item with identifier '${identifier}' does not exist in the store`);
    }
    await store.delete({ prefix: resource });
    let statusFile = await store.getJSON({ target: resourceStatusFile });
    delete statusFile.resources[resource];
    const itemStatus = updateItemStatus({ statusFile });
    statusFile.item = itemStatus;
    await store.put({ target: resourceStatusFile, json: statusFile, registerFile: false });
}

export async function putItemResource({
    identifier,
    resource,
    localPath = undefined,
    content = undefined,
    json,
}) {
    let store = await getStoreHandle({ id: identifier, type: "item" });
    if (!(await store.exists())) {
        throw new Error(`Item with identifier '${identifier}' does not exist in the store`);
    }
    await store.put({ target: resource, localPath, content, json });
}

export async function getItemResourceLink({
    identifier,
    resource,
    location = "workspace",
    download,
}) {
    let store = await getStoreHandle({ id: identifier, type: "item", location });
    if (!(await store.exists())) {
        throw new Error(`Item with identifier '${identifier}' does not exist in the store`);
    }

    if (!(await store.fileExists({ path: resource }))) {
        throw new Error("Not found");
    } else {
        return await store.getPresignedUrl({ target: resource, download });
    }
}

export async function listItemResources({ identifier, offset = 0, limit, location = "workspace" }) {
    const configuration = await loadConfiguration();
    let store = await getStoreHandle({ id: identifier, type: "item", location });
    if (!(await store.exists())) {
        throw new Error(`Item with identifier '${identifier}' does not exist in the store`);
    }

    let files = await store.listResources();
    ({ files } = filterSpecialFiles({ files }));

    let resources = getResourceNames({ identifier, files, naming: configuration.api.filenaming });
    let total = resources.length;
    resources = resources.map((r, i) => {
        let previous = i === 0 ? undefined : resources[i - 1];
        let next = i === resources.length ? undefined : resources[i + 1];
        return {
            previous,
            name: r,
            next,
            page: i + 1,
            total: resources.length,
        };
    });
    if (isNumber(offset) && isNumber(limit)) {
        resources = resources.slice(offset, offset + limit);
    }
    return { resources, total };
}

export async function listItemPermissionForms({ identifier }) {
    let store = await getStoreHandle({ id: identifier, type: "item" });
    if (!(await store.exists())) {
        throw new Error(`Item with identifier '${identifier}' does not exist in the store`);
    }

    let files = await store.listResources();
    files = files
        .filter((file) => file.Key.match(/permission\.pdf/))
        .map((file) => ({ name: file.Key }));
    return { files };
}

export async function deleteItemPermissionForm({ identifier, form }) {
    let store = await getStoreHandle({ id: identifier, type: "item" });
    if (!(await store.exists())) {
        throw new Error(`Item with identifier '${identifier}' does not exist in the store`);
    }
    await store.delete({ target: form });
}

export async function listItemResourceFiles({ identifier, resource }) {
    let store = await getStoreHandle({ id: identifier, type: "item" });
    if (!(await store.exists())) {
        throw new Error(`Item with identifier '${identifier}' does not exist in the store`);
    }
    // let { bucket } = await getS3Handle();
    let files;
    try {
        files = await store.listResources();
        ({ files } = filterSpecialFiles({ files }));
        const re = new RegExp(`${resource}\\.`);
        files = files.filter((f) => f.match(re));
    } catch (error) {
        files = [];
    }
    return { files };
}

function filterSpecialFiles({ files }) {
    files = files.map((f) => f.Key);
    files = files.filter((f) => !f.match(/^\./));
    files = files.filter((f) => {
        let matches = specialFiles.map((sf) => {
            let re = new RegExp(sf);
            return f.match(re) ? true : false;
        });
        return !matches.includes(true) ? f : null;
    });
    files = compact(files);
    return { files };
}

export function getResourceNames({ identifier, files, naming }) {
    let resources = [];
    for (let filename of files) {
        let ext = path.extname(filename).replace(".", "");
        let basename = path.basename(filename, `.${ext}`);
        let identifierSegments = basename
            .split(`-${naming.adminTag}`)[0]
            .split(naming.resourceQualifierSeparator)[0]
            .split("-");
        resources.push(identifierSegments.pop());
    }
    return uniq(resources)
        .map((r) => `${identifier}-${r}`)
        .sort();
}

export function groupFilesByResource({ identifier, files, naming }) {
    let resources = [];
    for (let filename of files) {
        let ext = path.extname(filename).replace(".", "");
        let basename = path.basename(filename, `.${ext}`);
        let identifierSegments = basename
            .split(`-${naming.adminTag}`)[0]
            .split(naming.resourceQualifierSeparator)[0]
            .split("-");

        let adminLabel = path.basename(filename, ext).split(naming.adminTag)[1];

        let type;
        imageExtensions.forEach((t) => {
            let re = new RegExp(t);
            type = ext.match(re) ? "image" : type;
        });

        let data = naming.identifierSegments[identifierSegments.length]
            .map((segmentName, i) => ({
                [segmentName]: identifierSegments[i],
            }))
            .reduce((acc, cv) => ({ ...acc, ...cv }));

        resources.push({
            file: path.join(identifier, filename),
            basename,
            name: filename,
            path: identifier,
            ext,
            adminLabel,
            type,
            ...data,
        });
    }

    return { files: groupBy(resources, "resourceId") };
}

// TODO this method does not have tests
export async function getResourceProcessingStatus({ identifier, itemId, taskIds }) {
    let store = await getStoreHandle({ id: identifier, type: "item" });
    if (!(await store.exists())) {
        throw new Error(`Item with identifier '${identifier}' does not exist in the store`);
    }
    let statusFile;
    try {
        statusFile = await store.getJSON({ target: resourceStatusFile });
    } catch (error) {
        statusFile = {
            item: {},
            resources: {},
        };
    }

    let where = {
        [Op.and]: {
            itemId,
            [Op.or]: taskIds.map((id) => ({ id })),
        },
    };
    let tasks = await models.task.findAll({ where, order: [["resource", "ASC"]] });
    let { resources } = await listItemResources({ identifier });
    resources = resources.map((r) => r.name);
    for (let task of tasks) {
        if (task.status !== "in progress" && task.resource && resources.includes(task.resource)) {
            const resource = path.basename(task.resource, path.extname(task.resource));
            statusFile = await updateResourceStatus({ identifier, resource, statusFile });
        }
    }

    const itemStatus = updateItemStatus({ statusFile });
    statusFile.item = itemStatus;

    await store.put({ target: resourceStatusFile, json: statusFile, registerFile: false });

    return tasks;
}

export async function statItemFile({ identifier, file }) {
    let { bucket } = await getS3Handle();

    let fileStat = await bucket.stat({ path: path.join(identifier, file) });
    return fileStat?.$metadata?.httpStatusCode === 200 ? true : false;
}

export async function markResourceComplete({ identifier, resource, complete = false }) {
    let store = await getStoreHandle({ id: identifier, type: "item" });
    if (!(await store.exists())) {
        throw new Error(`Item with identifier '${identifier}' does not exist in the store`);
    }

    let statusFile = await store.getJSON({ target: resourceStatusFile });
    if (!statusFile.resources[resource]) statusFile.resources[resource] = { tei: {} };
    statusFile.resources[resource].complete = JSON.parse(complete);
    const itemStatus = updateItemStatus({ statusFile });
    statusFile.item = itemStatus;
    await store.put({ json: statusFile, target: resourceStatusFile, registerFile: false });
}

export async function markAllResourcesComplete({ identifier, resources }) {
    let store = await getStoreHandle({ id: identifier, type: "item" });
    if (!(await store.exists())) {
        throw new Error(`Item with identifier '${identifier}' does not exist in the store`);
    }
    let statusFile = await store.getJSON({ target: resourceStatusFile });
    for (let resource of resources) {
        if (!statusFile.resources[resource]) statusFile.resources[resource] = { tei: {} };
        statusFile.resources[resource].complete = true;
    }
    const itemStatus = updateItemStatus({ statusFile });
    statusFile.item = itemStatus;
    await store.put({ json: statusFile, target: resourceStatusFile, registerFile: false });
}

export async function updateResourceStatus({ identifier, resource, statusFile }) {
    let store = await getStoreHandle({ id: identifier, type: "item" });
    if (!(await store.exists())) {
        throw new Error(`Item with identifier '${identifier}' does not exist in the store`);
    }

    let files = (await listItemResourceFiles({ identifier, resource })).files;
    if (!files) return;

    // update the resource status
    let status = {
        complete: statusFile.resources?.[resource]?.complete ?? false,
        thumbnail: files.filter((f) => f.match(/thumbnail/)).length ? true : false,
        webformats: (() => {
            let jpeg = files.filter((f) => f.match(/\.jpe?g/)).length ? true : false;
            let webp = files.filter((f) => f.match(/\.webp/)).length ? true : false;
            return jpeg && webp ? true : false;
        })(),
        textract: files.filter((f) => f.match(/\.textract_ocr/)).length === 1 ? true : false,
        tei: {
            exists: files.filter((f) => f.match(/\.tei\.xml/)).length === 1 ? true : false,
            wellFormed: false,
        },
    };
    if (status.tei.exists) {
        let document = await store.get({ target: `${resource}.tei.xml` });
        try {
            document = await transformDocument({ document });
            status.tei.wellFormed = true;
            status.tei.error = undefined;
        } catch (error) {
            status.complete = false;
            status.tei.wellFormed = false;
            status.tei.error = error.message;
        }
    } else {
        status.complete = false;
        status.tei.wellFormed = false;
    }

    statusFile.resources[resource] = status;
    return statusFile;
}

// TODO this method does not have tests
export function updateItemStatus({ statusFile }) {
    // update the item statistics based on all resources
    const resources = Object.keys(statusFile.resources).map((key) => statusFile.resources[key]);
    let itemStatus = {
        pages: {
            total: resources.length,
            completed: resources.filter((resource) => resource.complete).length,
            bad: resources.filter((resource) => !resource.tei.wellFormed).length,
        },
    };
    return itemStatus;
}

export async function getResourceStatus({ identifier, resource }) {
    let store = await getStoreHandle({ id: identifier, type: "item" });
    if (!(await store.exists())) {
        throw new Error(`Item with identifier '${identifier}' does not exist in the store`);
    }

    let statusFile = await store.getJSON({ target: resourceStatusFile });
    return { status: statusFile.resources[resource] };
}

export async function saveItemTranscription({ identifier, resource, document }) {
    let store = await getStoreHandle({ id: identifier, type: "item" });
    if (!(await store.exists())) {
        throw new Error(`Item with identifier '${identifier}' does not exist in the store`);
    }
    let file = `${resource}.tei.xml`;
    try {
        await putItemResource({ identifier, resource: file, content: document });
    } catch (error) {
        log.error(`Error saving transcription: ${error.message}`);
        return res.internalServerError();
    }

    let statusFile = await store.getJSON({ target: resourceStatusFile });
    statusFile = await updateResourceStatus({ identifier, resource, statusFile });
    const itemStatus = updateItemStatus({ statusFile });
    statusFile.item = itemStatus;
    await store.put({ target: resourceStatusFile, json: statusFile, registerFile: false });
    return { status: statusFile[resource] };
}
