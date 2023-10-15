import {
    demandAdministrator,
    demandAuthenticatedUser,
    isUserAuthenticated,
    getLogger,
    getStoreHandle,
    indexItem,
    loadProfile,
} from "../common/index.js";
import { deleteItemFromRepository } from "../lib/admin.js";
import { listItemResources, getItemResourceLink } from "../lib/item.js";
import { getRepositoryItems } from "../lib/repository.js";
import { transformDocument } from "../lib/transform.js";
import models from "../models/index.js";
import esb from "elastic-builder";
import { Client } from "@elastic/elasticsearch";
import lodashPkg from "lodash";
const { flattenDeep } = lodashPkg;

const log = getLogger();

export function setupRoutes(fastify, options, done) {
    fastify.get("/repository/lookup/language", getRepositoryLookupLanguageHandler);
    fastify.post("/repository/search", postRepositorySearchHandler);
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
export async function getRepositoryLookupLanguageHandler(req) {
    // let esbQuery = esb
    //     .requestBodySearch()
    //     .agg([
    //         esb.termsAggregation("contentLanguages", "contentLanguage.keyword"),
    //         esb.termsAggregation("subjectLanguages", "subjectLanguage.keyword")
    //     ]);
    //  let esbQuery = esb
    //      .requestBodySearch()
    //      .suggest(esb.termSuggester("contentLanguage", "contentLanguage", req.query.query));

    //  let esbQuery = esb
    //      .requestBodySearch()
    //      .suggest(
    //          new esb.CompletionSuggester("languages", "languageSuggest").prefix(req.query.query)
    //      );

    try {
        let esbQuery = esb
            .requestBodySearch()
            .query(
                esb
                    .boolQuery()
                    .must(esb.matchQuery("@type", "Language"))
                    .should([
                        esb.matchQuery("name", req.query.query).fuzziness(2),
                        esb.matchQuery("iso639-3", req.query.query).fuzziness(2),
                        esb.matchQuery("languageCode", req.query.query).fuzziness(2),
                        esb.matchQuery("alternateName", req.query.query).fuzziness(2),
                    ])
            )
            .aggs([
                esb.termsAggregation("name", "name.keyword").size(5),
                esb.termsAggregation("iso639-3", "iso639-3.keyword").size(3),
                esb.termsAggregation("alternateName", "alternateName.keyword").size(5),
                esb.termsAggregation("languageCode", "languageCode.keyword").size(3),
            ]);

        const client = new Client({
            node: req.session.configuration.api.services.elastic.host,
        });
        // console.log(JSON.stringify(esbQuery, null, 2));
        let query = {
            index: "entities",
            ...esbQuery.toJSON(),
            fields: ["name", "languageCode", "alternateName"],
            _source: false,
        };
        let result = await client.search(query);

        let matches = flattenDeep(
            Object.keys(result.aggregations).map((agg) => {
                return result.aggregations[agg].buckets.map((bucket) => bucket.key);
            })
        );
        return { matches };
    } catch (error) {
        console.log(error);
    }
    return { matches: [] };
    // return result.hits;
}

// TODO this code does not have tests yet
async function postRepositorySearchHandler(req) {
    const bounds = req.body.boundingBox;

    let mustMatchQuery = [
        esb
            .geoShapeQuery("location")
            .shape(
                esb
                    .geoShape()
                    .type("envelope")
                    .coordinates([
                        [bounds.topLeft.lng, bounds.topLeft.lat],
                        [bounds.bottomRight.lng, bounds.bottomRight.lat],
                    ])
            )
            .relation("intersects"),
    ];
    if (req.body.language) {
        mustMatchQuery.push(
            esb
                .boolQuery()
                .should([
                    esb.matchQuery("contentLanguage", req.body.language).fuzziness(2),
                    esb.matchQuery("subjectLanguage", req.body.language).fuzziness(2),
                ])
        );
    }
    if (req.body.text) {
        mustMatchQuery.push(
            esb
                .boolQuery()
                .should([
                    esb.matchQuery("name", req.body.text).fuzziness("AUTO"),
                    esb.matchQuery("description", req.body.text).fuzziness("AUTO"),
                    esb.matchQuery("text", req.body.text).fuzziness("AUTO"),
                ])
        );
    }
    let esbQuery = esb.requestBodySearch().query(esb.boolQuery().must(mustMatchQuery)).size(1000);
    // console.log(JSON.stringify(esbQuery, null, 2));

    const client = new Client({
        node: req.session.configuration.api.services.elastic.host,
    });
    let query = {
        index: "manuscripts",
        ...esbQuery.toJSON(),
        fields: ["name", "description", "identifier", "location", "access"],
        _source: false,
    };
    let result = await client.search(query);
    return result.hits;
}

async function getRepositoryItemMetadataHandler(req, res) {
    try {
        let profile = await loadProfile({ profile: `nyingarn-item-profile.json` });
        let store = await getStoreHandle({
            identifier: req.params.identifier,
            type: "item",
            location: "repository",
        });
        let crate = await store.getJSON({ target: "ro-crate-metadata.json" });
        return { crate, profile };
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
    await indexItem({
        location: "repository",
        configuration: req.session.configuration,
        item,
        crate,
    });

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
            await indexItem({
                location: "repository",
                configuration: req.session.configuration,
                item,
                crate,
            });
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
