import {
    listObjects,
    demandAdministrator,
    demandAuthenticatedUser,
    getStoreHandle,
    getS3Handle,
    authorisedUsersFile,
    imageExtensions,
} from "../common/index.js";
import { lookupItemByIdentifier, linkItemToUser, getItems } from "../lib/item.js";
import {
    lookupCollectionByIdentifier,
    linkCollectionToUser,
    getCollections,
} from "../lib/collection.js";
import models from "../models/index.js";
import { Op, fn as seqFn, col as seqCol } from "sequelize";
import lodashPkg from "lodash";
const { groupBy } = lodashPkg;
import { ROCrate } from "ro-crate";
import { getContext } from "../lib/crate-tools.js";
import path from "path";

export async function getAdminItems({ user, prefix, offset = 0 }) {
    if (!user.administrator) {
        throw new Error(`User must be an admin`);
    }
    const limit = 10;

    let myItems = await models.item.findAll({
        where: {},
        include: [{ model: models.user, where: { id: user.id } }],
        attributes: ["identifier"],
    });
    myItems = groupBy(myItems, "identifier");

    let { count: total, rows: items } = await getItems({ offset, limit, match: prefix });

    items = items.map((i) => ({
        ...i.get(),
        connected: myItems[i.identifier]?.length ? true : false,
    }));
    return { items, total };
}

export async function getAdminCollections({ user, prefix, offset = 0 }) {
    if (!user.administrator) {
        throw new Error(`User must be an admin`);
    }
    const limit = 10;

    let myCollections = await models.collection.findAll({
        where: {},
        include: [{ model: models.user, where: { id: user.id } }],
        attributes: ["identifier"],
    });
    myCollections = groupBy(myCollections, "identifier");

    let { count: total, rows: collections } = await getCollections({
        offset,
        limit,
        match: prefix,
    });

    collections = collections.map((c) => ({
        ...c.get(),
        connected: myCollections[c.identifier]?.length ? true : false,
    }));

    return { collections, total };
}

export async function importItemsFromStorageIntoTheDb({ user, configuration }) {
    if (!user.administrator) {
        throw new Error(`User must be an admin`);
    }
    let items =
        (await listObjects({ prefix: `/${configuration.api.domain}/workspace/item` })) || [];
    items = items.map((i) => ({ identifier: i }));

    // insert any items found on the backend storage not already in the DB
    for (let item of items) {
        await models.item.findOrCreate({
            where: { identifier: item.identifier },
        });
    }

    // ensure all existing items and collections have a publicationStatus
    await models.item.update(
        { publicationStatus: "inProgress" },
        { where: { publicationStatus: null } }
    );
    return {};
}

export async function importCollectionsFromStorageIntoTheDb({ user, configuration }) {
    if (!user.administrator) {
        throw new Error(`User must be an admin`);
    }
    let collections =
        (await listObjects({ prefix: `/${configuration.api.domain}/workspace/collection` })) || [];
    collections = collections.map((i) => ({ identifier: i }));

    // insert any collections found on the backend storage not already in the DB
    for (let collection of collections) {
        await models.collection.findOrCreate({
            where: { identifier: collection.identifier },
        });
    }

    // ensure all existing items and collections have a publicationStatus
    await models.collection.update(
        { publicationStatus: "inProgress" },
        { where: { publicationStatus: null } }
    );
    return {};
}

export async function connectAdminToItem({ identifier, user }) {
    if (!user.administrator) {
        throw new Error(`User must be an admin`);
    }
    let item = await lookupItemByIdentifier({ identifier: identifier });
    await linkItemToUser({ itemId: item.id, userId: user.id });
    return {};
}

export async function connectAdminToCollection({ identifier, user }) {
    if (!user.administrator) {
        throw new Error(`User must be an admin`);
    }
    let collection = await lookupCollectionByIdentifier({ identifier: identifier });
    await linkCollectionToUser({ collectionId: collection.id, userId: user.id });
    return {};
}

export async function getItemsAwaitingReview({ user }) {
    if (!user.administrator) {
        throw new Error(`User must be an admin`);
    }
    let items = await models.item.findAll({
        where: { publicationStatus: "awaitingReview" },
        attributes: ["identifier", "publicationStatus", "publicationMetadata"],
    });
    if (items) {
        items = items.map((item) => item.get());
        return { items };
    } else {
        return [];
    }
}

export async function getCollectionsAwaitingReview({ user }) {
    if (!user.administrator) {
        throw new Error(`User must be an admin`);
    }
    let collections = await models.collection.findAll({
        where: { publicationStatus: "awaitingReview" },
        attributes: ["identifier", "publicationStatus", "publicationMetadata"],
    });
    if (collections) {
        collections = collections.map((collection) => collection.get());
        return { collections };
    } else {
        return [];
    }
}

export async function publishObject({ user, type, identifier, configuration }) {
    if (!user.administrator) {
        throw new Error(`User must be an admin`);
    }
    let store = await getStoreHandle({
        id: identifier,
        type,
    });

    let crate;
    try {
        crate = await store.getJSON({ target: "ro-crate-metadata.json" });
        crate = new ROCrate(crate, { array: true });
    } catch (error) {
        console.log(error);
        throw new Error(`Error getting / handling RO Crate file`);
    }

    let licence;
    if (type === "collection") {
        const collection = await lookupCollectionByIdentifier({ identifier });
        collection.publicationStatus = "published";
        await collection.save();

        // write the metadata into the crate
        licence = {
            "@id": configuration.api.licence,
            "@type": ["File", "DataReuselicence"],
            name: "Open (subject to agreeing to PDSC access conditions)",
            access: {
                "@id": "http://purl.archive.org/language-data-commons/terms#OpenAccess",
            },
            authorizationWorkflow: [
                { "@id": "http://purl.archive.org/language-data-commons/terms#AgreeToTerms" },
            ],
        };
    } else if (type === "item") {
        const item = await lookupItemByIdentifier({ identifier });
        item.publicationStatus = "published";
        await item.save();

        licence = {
            "@id": configuration.api.licence,
            "@type": ["File", "DataReuselicence"],
            name: "Open (subject to agreeing to PDSC access conditions)",
            access: {
                "@id": "http://purl.archive.org/language-data-commons/terms#OpenAccess",
            },
            authorizationWorkflow: [
                { "@id": "http://purl.archive.org/language-data-commons/terms#AgreeToTerms" },
            ],
        };
        if (item.accessType === "restricted") {
            licence.description = item.accessNarrative.text;
            licence.reviewDate = item.accessNarrative?.reviewDate;
            licence.access = {
                "@id": "http://purl.archive.org/language-data-commons/terms#AuthorizedAccess",
            };
            licence.authorizationWorkflow.push({
                "@id": "http://purl.archive.org/language-data-commons/terms#AccessControlList",
            });
            licence.accessControlList = `file://${authorisedUsersFile}`;
        }
    }

    if (crate.getEntity(licence["@id"])) crate.deleteEntity(licence["@id"]);
    crate.addEntity(licence);
    crate.rootDataset.licence = licence;
    crate.rootDataset.identifier = identifier;
    crate = crate.toJSON();
    crate["@context"] = getContext();
    await store.put({ target: "ro-crate-metadata.json", json: crate });
    await store.put({
        target: configuration.api.licence,
        localPath: path.join(`/srv/configuration/${configuration.api.licence}`),
        registerFile: false,
    });

    return {};
}

export async function objectRequiresMoreWork({ type, identifier }) {
    let model;
    if (type === "collection") {
        model = await lookupCollectionByIdentifier({ identifier });
    } else if (type === "item") {
        model = await lookupItemByIdentifier({ identifier });
    }
    model.publicationStatus = "needsWork";
    await model.save();
}

export async function depositObjectIntoRepository({
    type,
    identifier,
    version = { metadata: false, images: false, documents: false },
    io = { emit: () => {} },
}) {
    const objectWorkspace = await getStoreHandle({ identifier, type });
    const objectRepository = await getStoreHandle({
        identifier,
        type,
        location: "repository",
    });
    objectRepository.on("copy", (event) => {
        io.emit("deposit-item", { msg: `Batch: ${event.msg}`, date: event.date });
    });

    const repositoryObjectExists = await objectRepository.exists();
    if (!repositoryObjectExists) {
        // create the object location in the repo
        io.emit("deposit-item", { msg: `Creating the item in the repository`, date: new Date() });
        await objectRepository.createObject();
        let { bucket } = await getS3Handle();

        // on first create - remove the metadata file so that no matter what,
        //  it won't get versioned
        await bucket.removeObjects({
            keys: [path.join(objectRepository.objectPath, "ro-crate-metadata.json")],
        });
    }

    // copy over all of the files from the workspace entry
    let resources = await objectWorkspace.listResources();
    io.emit("deposit-item", { msg: `Getting item resources`, date: new Date() });
    resources = resources
        .filter((resource) => !resource.Key.match(/nocfl.*/))
        .map((resource) => {
            let versionFile = false;
            // version metadata ?
            if (resource.Key === "ro-crate-metadata.json" && version.metadata) {
                versionFile = true;
            } else {
                let extension = path.extname(resource.Key).replace(/\./, "");
                if (extension === "xml" && version.documents) {
                    versionFile = true;
                } else if (version.images) {
                    versionFile = true;
                }
            }

            return {
                target: resource.Key,
                source: objectWorkspace.resolvePath({ path: resource.Key }),
                version: versionFile,
            };
        });
    io.emit("deposit-item", { msg: `Copying item resources to the repository`, date: new Date() });
    await objectRepository.copy({ batch: resources });

    // delete the files from the workspace entry
    io.emit("deposit-item", { msg: `Removing the item from the workspace`, date: new Date() });
    await objectWorkspace.removeObject();
    io.emit("deposit-item", { msg: `Done`, date: new Date() });
}

export async function restoreObjectIntoWorkspace({ type, identifier, io = { emit: () => {} } }) {
    const objectWorkspace = await getStoreHandle({ identifier, type });
    const objectRepository = await getStoreHandle({
        identifier,
        type,
        location: "repository",
    });
    objectWorkspace.on("copy", (event) => {
        io.emit("restore-item", { msg: `Batch: ${event.msg}`, date: event.date });
    });

    const workspaceObjectExists = await objectWorkspace.exists();
    if (!workspaceObjectExists) {
        // create the object location in the repo
        io.emit("restore-item", { msg: `Creating the item in the workspace`, date: new Date() });
        await objectWorkspace.createObject();
        let { bucket } = await getS3Handle();

        // on first create - remove the metadata file so that not matter what,
        //  it won't get versioned
        await bucket.removeObjects({
            keys: [path.join(objectWorkspace.objectPath, "ro-crate-metadata.json")],
        });
    }

    // copy over all non versioned files from the repository entry
    io.emit("restore-item", { msg: `Getting item resources`, date: new Date() });
    let resources = await objectRepository.listResources();
    resources = resources
        .filter((resource) => !resource.Key.match(/nocfl.*/))
        .filter((resource) => {
            return !resource.Key.match(
                /.*\.v\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z).*/
            );
        })
        .map((resource) => {
            return {
                target: resource.Key,
                source: objectRepository.resolvePath({ path: resource.Key }),
            };
        });

    io.emit("restore-item", {
        msg: `Copying item resources to the workspace`,
        date: new Date(),
    });
    await objectWorkspace.copy({ batch: resources });
}
