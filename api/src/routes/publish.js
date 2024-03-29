import {
    demandAuthenticatedUser,
    requireCollectionAccess,
    requireItemAccess,
} from "../common/middleware.js";
import { getStoreHandle } from "../common/getS3Handle.js";
import { authorisedUsersFile } from "../common/index.js";
import { listItemResources, markAllResourcesComplete } from "../lib/item.js";
import lodashPkg from "lodash";
const { uniqBy, uniq } = lodashPkg;
import validatorPkg from "validator";
const { isURL } = validatorPkg;
import { ROCrate } from "ro-crate";
import { registerAllFiles, getContext } from "../lib/crate-tools.js";
import { SES } from "../common/aws-ses.js";
import models from "../models/index.js";

export function setupRoutes(fastify, options, done) {
    fastify.addHook("preHandler", demandAuthenticatedUser);

    fastify.register((fastify, options, done) => {
        fastify.addHook("preHandler", requireCollectionAccess);
        fastify.post("/publish/collections/:identifier", postPublishCollectionHandler);
        fastify.get("/publish/collections/:identifier/status", getCollectionPublicationStatus);
        done();
    });

    fastify.register((fastify, options, done) => {
        fastify.addHook("preHandler", requireItemAccess);
        fastify.post("/publish/items/:identifier", postPublishItemHandler);
        fastify.get("/publish/items/:identifier/status", getItemPublicationStatus);
        done();
    });
    done();
}

async function postPublishCollectionHandler(req, res) {
    if (isURL(req.body.user["@id"], { protocols: ["http", "https"] })) {
        req.session.user.identifier = req.body.user["@id"];
        await req.session.user.save();
    }
    // check that permission forms are loaded
    //  TODO: not yet implemented

    // set the properties for this collection
    req.io.to(req.query.clientId).emit("publish-item", {
        msg: `Setting the collection status to 'Awaiting Review'`,
        date: new Date(),
    });
    req.session.collection.publicationStatus = "awaitingReview";
    req.session.collection.publicationMetadata = {
        accessType: "open",
    };

    // save the collection
    await req.session.collection.save();

    let store = await getStoreHandle({
        id: req.session.collection.identifier,
        type: "collection",
    });

    // remove .collection file if it exists
    if (await store.fileExists({ path: ".collection" })) {
        await store.delete({ target: ".collection" });
    }

    // write the metadata into the crate
    try {
        req.io.to(req.query.clientId).emit("publish-item", {
            msg: `Updating the crate metadata`,
            date: new Date(),
        });
        let crate = await store.getJSON({ target: "ro-crate-metadata.json" });
        crate = new ROCrate(crate, { array: true });

        crate.addEntity(req.body.user);
        let depositor = crate.rootDataset.depositor;
        if (!depositor) {
            depositor = [req.body.user];
        } else {
            depositor.push(req.body.user);
            depositor = uniqBy(depositor, "@id");
        }
        crate.rootDataset.depositor = depositor;
        crate = crate.toJSON();
        crate["@context"] = getContext();

        await store.put({ target: "ro-crate-metadata.json", json: crate });
        req.io.to(req.query.clientId).emit("publish-collection", { msg: `Done`, date: new Date() });

        await notifyAwaitingReview({ configuration: req.session.configuration });
    } catch (error) {
        console.log(error);
    }
}

async function getCollectionPublicationStatus(req) {
    return {
        status: req.session.collection.publicationStatus,
        visibility: req.session.collection.publicationMetadata?.accessType,
    };
}

async function postPublishItemHandler(req, res) {
    if (isURL(req.body.user["@id"], { protocols: ["http", "https"] })) {
        req.session.user.identifier = req.body.user["@id"];
        await req.session.user.save();
    }

    req.io
        .to(req.query.clientId)
        .emit("publish-item", { msg: `Getting item resources`, date: new Date() });
    let listResources = await listItemResources({ identifier: req.session.item.identifier });
    const resources = listResources.resources;

    req.io
        .to(req.query.clientId)
        .emit("publish-item", { msg: `Marking all resources as complete`, date: new Date() });
    try {
        await markAllResourcesComplete({
            identifier: req.session.item.identifier,
            resources: resources.map((r) => r.name),
        });
    } catch (error) {
        console.log(error);
    }

    // reset the properties first
    req.io.to(req.query.clientId).emit("publish-item", {
        msg: `Setting the item status to 'Awaiting Review'`,
        date: new Date(),
    });
    req.session.item.publicationStatus = "awaitingReview";
    req.session.item.publicationMetadata = {
        accessType: req.body.access.visibility,
        accessControlList: req.body.access.visibility === "open" ? [] : req.body.access?.acl,
        publicationStatusLogs: ["all pages marked complete", "permission forms not loaded"],
        accessNarrative: {
            text: req.body.access.narrative,
            reviewDate: req.body.access?.reviewDate,
        },
    };

    // save the item
    await req.session.item.save();

    let store = await getStoreHandle({ id: req.session.item.identifier, type: "item" });

    // remove authorised users file if exists and item open
    if (await store.fileExists({ path: authorisedUsersFile })) {
        await store.delete({ target: authorisedUsersFile });
    }
    // remove .item file if it exists
    if (await store.fileExists({ path: ".item" })) {
        await store.delete({ target: ".item" });
    }

    // write the metadata into the crate
    try {
        req.io.to(req.query.clientId).emit("publish-item", {
            msg: `Updating the crate metadata and registering all files`,
            date: new Date(),
        });
        let crate = await store.getJSON({ target: "ro-crate-metadata.json" });
        const resources = await store.listResources();

        crate = new ROCrate(crate, { array: true });

        crate.addEntity(req.body.user);
        let depositor = crate.rootDataset.depositor;
        if (!depositor) {
            depositor = [req.body.user];
        } else {
            depositor.push(req.body.user);
            depositor = uniqBy(depositor, "@id");
        }
        crate.rootDataset.depositor = depositor;

        crate = await registerAllFiles({ crate, resources });

        crate = crate.toJSON();
        crate["@context"] = getContext();

        if (req.session.item.publicationMetadata.accessType === "restricted") {
            await store.put({ target: authorisedUsersFile, json: req.body.access.acl ?? [] });
        }

        await store.put({ target: "ro-crate-metadata.json", json: crate });
        req.io.to(req.query.clientId).emit("publish-item", { msg: `Done`, date: new Date() });

        await notifyAwaitingReview({ configuration: req.session.configuration });
    } catch (error) {
        console.log(error);
    }
}

async function getItemPublicationStatus(req) {
    let emails = [...req.session.item.users.map((u) => u.email)];
    if (req.session.item.publicationMetadata?.accessControlList?.length) {
        emails = [...emails, ...req.session.item.publicationMetadata?.accessControlList];
    }
    emails = uniq(emails);
    return {
        status: req.session.item.publicationStatus,
        visibility: req.session.item.publicationMetadata?.accessType,
        emails,
        narrative: req.session.item.publicationMetadata?.accessNarrative?.text,
        reviewDate: req.session.item.publicationMetadata?.accessNarrative?.reviewDate,
    };
}

async function notifyAwaitingReview({ configuration }) {
    const aws = configuration.api.services.aws;
    const ses = new SES({
        accessKeyId: aws.awsAccessKeyId,
        secretAccessKey: aws.awsSecretAccessKey,
        region: aws.region,
        mode: configuration.api.ses.mode,
        source: configuration.api.ses.source,
        replyTo: configuration.api.ses.replyTo,
    });
    let adminEmails = await models.user.findAll({
        where: { administrator: true },
        attributes: ["email"],
        raw: true,
    });
    let response = await ses.sendMessage({
        templateName: `${configuration.api.ses.mode}-awaiting-review`,
        data: {},
        to: adminEmails.map((u) => u.email),
    });
}
