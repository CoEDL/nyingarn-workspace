import {
    demandAdministrator,
    demandAuthenticatedUser,
    isUserAuthenticated,
    getLogger,
    getStoreHandle,
    indexItem,
} from "../common/index.js";
import { deleteItemFromRepository } from "../lib/admin.js";
import { listItemResources, getItemResourceLink } from "../lib/item.js";
import { getRepositoryItems } from "../lib/repository.js";
import { transformDocument } from "../lib/transform.js";
import models from "../models/index.js";
import esb from "elastic-builder";
import { Client } from "@elastic/elasticsearch";

const log = getLogger();

export function setupRoutes(fastify, options, done) {
    fastify.get("/repository/search", postRepositorySearchHandler);
    fastify.get("/repository/item/:identifier", getRepositoryItemMetadataHandler);
    fastify.get("/repository/item/:identifier/:resourceId", getItemResourceDataHandler);
    fastify.get("/repository/item/:identifier/resources", getItemResourcesHandler);
    fastify.get("/repository/item/:identifier/thumbnails", getItemThumbnailsHandler);

    fastify.register((fastify, options, done) => {
        fastify.addHook("preHandler", demandAuthenticatedUser);
        fastify.addHook("preHandler", demandAdministrator);
        fastify.get("/repository/lookup-content", getRepositoryLookupContentHandler);
        fastify.get("/repository/index-all-content", indexAllRepositoryContentHandler);
        fastify.get("/repository/index/:id", indexRepositoryItemHandler);
        fastify.delete("/repository/:type/:identifier", deleteRepositoryObjectHandler);
        done();
    });
    done();
}

async function getItem({ identifier }) {
    let item = await models.repoitem.findOne({ where: { identifier, type: "item" } });
    return item;
}

// TODO this code does not have tests yet
async function postRepositorySearchHandler(req) {
    let esbQuery = esb
        .requestBodySearch()
        .query(
            esb
                .boolQuery()
                .should(esb.matchQuery("name", req.query.query).operator("AND"))
                .should(esb.matchQuery("description", req.query.query).operator("AND"))
                .should(esb.matchQuery("subjectLanguage.name", req.query.query).operator("AND"))
                .should(
                    esb.matchQuery("subjectLanguage.languageCode", req.query.query).operator("AND")
                )
                .should(
                    esb.matchQuery("subjectLanguage.alternateName", req.query.query).operator("AND")
                )
                .should(esb.matchQuery("contentLanguage.name", req.query.query).operator("AND"))
                .should(
                    esb.matchQuery("contentLanguage.alternateName", req.query.query).operator("AND")
                )
        );

    const client = new Client({
        node: req.session.configuration.api.services.elastic.host,
    });
    let query = {
        index: "metadata",
        ...esbQuery.toJSON(),
        fields: ["name", "description"],
        _source: false,
    };
    // console.log(JSON.stringify(query, null, 2));
    let result = await client.search(query);
    // console.log(JSON.stringify(result.hits.hits.slice(0, 3), null, 2));
    return result.hits;
}

async function getRepositoryItemMetadataHandler(req, res) {
    try {
        let store = await getStoreHandle({
            identifier: req.params.identifier,
            type: "item",
            location: "repository",
        });
        let crate = await store.getJSON({ target: "ro-crate-metadata.json" });
        return { crate };
    } catch (error) {
        if (error.Code === "NoSuchKey") {
            return res.notFound();
        }
        res.badRequest();
    }
}

async function getItemResourcesHandler(req) {
    let resources = await listItemResources({
        identifier: req.params.identifier,
        location: "repository",
    });
    return resources;
}

async function getItemThumbnailsHandler(req, res) {
    const item = await getItem({ identifier: req.params.identifier });
    const user = await isUserAuthenticated(req);

    if (!item.openAccess) {
        if (!user?.email && !item?.accessControlList?.includes(user?.email)) {
            return {
                total: 0,
                thumbnails: [],
                message: {
                    code: "Access Denied",
                    reason: !user?.email
                        ? "The content of this item cannot be shown because you are not logged in."
                        : "The content of this item cannot be shown because you are not authorised to see it.",
                },
            };
        }
    }

    const pageSize = req.query.pageSize ? parseInt(req.query.pageSize) : 20;
    const offset = req.query.offset ? parseInt(req.query.offset) : 0;
    let store = await getStoreHandle({
        identifier: req.params.identifier,
        type: "item",
        location: "repository",
    });
    let resources = await store.listResources();
    resources = resources.filter((r) => r.Key.match(/thumbnail/)).map((r) => r.Key);

    let thumbnails = [];
    let total = resources.length;
    for (let resource of resources.slice(offset, offset + pageSize)) {
        thumbnails.push({
            name: resource.split(".")[0],
            filename: resource,
            url: await store.getPresignedUrl({ target: resource }),
        });
    }
    return { total, thumbnails };
}

async function getItemResourceDataHandler(req) {
    const item = await getItem({ identifier: req.params.identifier });
    const user = await isUserAuthenticated(req);

    if (!item.openAccess) {
        if (!user?.email && !item?.accessControlList?.includes(user?.email)) {
            return {
                total: 0,
                thumbnails: [],
                message: {
                    code: "Access Denied",
                    reason: !user?.email
                        ? "The content of this item cannot be shown because you are not logged in."
                        : "The content of this item cannot be shown because you are not authorised to see it.",
                },
            };
        }
    }

    let store = await getStoreHandle({
        id: req.params.identifier,
        type: "item",
        location: "repository",
    });
    let data = await Promise.all([
        getItemResourceLink({
            identifier: req.params.identifier,
            resource: `${req.params.resourceId}.jpg`,
            location: "repository",
        }),
        store.get({ target: `${req.params.resourceId}.tei.xml` }),
    ]);

    let document;
    try {
        document = await transformDocument({ document: data[1] });
    } catch (error) {
        console.log(error);
    }
    return { imageUrl: data[0], document };
}

async function getRepositoryLookupContentHandler(req) {
    let { prefix, offset } = req.query;
    let { items, total } = await getRepositoryItems({ user: req.session.user, prefix, offset });
    return { items, total };
}

async function indexRepositoryItemHandler(req) {
    let { id } = req.params;
    const item = await models.repoitem.findOne({ where: { id } });

    let store = await getStoreHandle({
        identifier: item.identifier,
        type: item.type,
        location: "repository",
    });
    let crate = await store.getJSON({ target: "ro-crate-metadata.json" });

    // index the specified item
    await indexItem({ item, crate });

    return {};
}

async function indexAllRepositoryContentHandler(req) {
    let itemsIndexed = 0;
    await indexItems(itemsIndexed);

    async function indexItems(itemsIndexed) {
        let { items, total } = await getRepositoryItems({
            user: req.session.user,
            offset: itemsIndexed,
        });

        for (let item of items) {
            let store = await getStoreHandle({
                identifier: item.identifier,
                type: item.type,
                location: "repository",
            });
            let crate = await store.getJSON({ target: "ro-crate-metadata.json" });
            await indexItem({ item, crate });
            itemsIndexed += 1;
        }
        if (itemsIndexed < total) await indexItems(itemsIndexed);
    }
    return {};
}

async function deleteRepositoryObjectHandler(req, res) {
    let { type, identifier } = req.params;
    try {
        await deleteItemFromRepository({
            type,
            identifier,
            configuration: req.session.configuration,
        });
    } catch (error) {
        log.error(`There was a problem removing the item from the repository`);
        console.error(error);
        return res.internalServerError();
    }
}
