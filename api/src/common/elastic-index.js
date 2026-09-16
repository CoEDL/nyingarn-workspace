import { getStoreHandle } from "./getS3Handle.js";
import lodashPkg from "lodash";
const { isArray, isString, isPlainObject, flattenDeep, compact } = lodashPkg;
import fsExtraPkg from "fs-extra";
const { createReadStream } = fsExtraPkg;
import { Client } from "@elastic/elasticsearch";
import { log } from "./logger.js";
import { ROCrate } from "ro-crate";
// import { FormData, File, Blob } from "formdata-node";
// import { Buffer } from "node:buffer";
import FormData from "form-data";
import fetch from "cross-fetch";

const typesToExcludeFromIndex = ["File", "GeoShape", "GeoCoordinates"];

export async function indexItem({ location = "workspace", configuration, item, crate }) {
    const indexName = location === "repository" ? "manuscripts" : "workspace-manuscripts";
    crate = new ROCrate(crate, { array: true, link: true });
    // let document = crate.getTree({ valueObject: false });

    const client = new Client({
        node: configuration.api.services.elastic.host,
    });

    // setup the metadata index
    try {
        // await client.indices.delete({ index: indexName });
        await client.indices.get({ index: indexName });
    } catch (error) {
        await client.synonyms.putSynonym({
            id: "nyingarn-synonyms",
            synonyms_set: []
        });
        await client.indices.create({
            index: indexName,
            mappings: {
                properties: {
                    location: {
                        type: "geo_shape",
                    },
                    text: {
                        type: "text",
                        search_analyzer: "nyingarn_synonym"
                    },
                    phoneticText: {
                        type: "text",
                        analyzer: "nyingarn_phonetic"
                    }
                },
            },
            settings: {
                index: {
                    analysis: {
                        analyzer: {
                            nyingarn_synonym: {
                                tokenizer: "standard",
                                filter: [
                                    "lowercase",
                                    "synonym_filter"
                                ]
                            },
                            nyingarn_phonetic: {
                                tokenizer: "standard",
                                filter: [
                                    "lowercase",
                                    "nyingarn-phonetic"
                                ]
                            },
                        },
                        filter: {
                            synonym_filter: {
                                type: "synonym_graph",
                                synonyms_set: "nyingarn-synonyms",
                                updateable: true
                            }
                        }
                    },
                    mapping: {
                        ignore_malformed: true
                    }
                }
            },
        });
    }

    // index the item metadata and content
    const indexIdentifier = `/${item.type}/${item.identifier}`;
    let store = await getStoreHandle({ location, id: item.identifier, type: "item" });
    let teiText;
    try {
        const teiFileContent = await store.get({
            target: `${item.identifier}-tei-complete.xml`,
        });
        teiText = await extractText({
            configuration,
            content: teiFileContent,
        });
    } catch (error) {
        teiText = "";
    }
    const document = assembleIndexRecord({ crate });
    document.text = teiText;
    document.phoneticText = teiText;
    await client.index({
        index: indexName,
        id: indexIdentifier,
        document,
    });
    // console.log(document);
    // setup the entities index
    try {
        // await client.indices.delete({ index: "entities" });
        await client.indices.get({ index: "entities" });
    } catch (error) {
        await client.indices.create({ index: "entities" });
    }
    let entities = assembleEntityLookupRecords({ crate });
    // console.log(entities);
    for (let entity of entities) {
        await client.index({
            index: "entities",
            id: encodeURIComponent(entity["@id"]),
            document: entity,
        });
    }
}

export async function deleteItemFromIndex({ location = "workspace", item, configuration }) {
    const indexName = location === "repository" ? "manuscripts" : "workspace-manuscripts";
    const client = new Client({
        node: configuration.api.services.elastic.host,
    });

    const indexIdentifier = `/${item.type}/${item.identifier}`;
    await client.delete({
        index: indexName,
        id: indexIdentifier,
    });
}

// TODO this method does not have tests
export function assembleIndexRecord({ crate }) {
    // console.log(crate);

    let geography = extractGeography({ crate });
    let record = {
        name: crate.rootDataset?.name?.join(" ") ?? "",
        description: crate.rootDataset?.description?.join(" ") ?? "",
        identifier: crate.rootDataset?.identifier?.[0] ?? "",
        subjectLanguage:
            flattenDeep(
                crate.rootDataset?.subjectLanguage?.map((l) => {
                    return [l.name, l.alternateName, l.languageCode];
                })
            ) ?? [],
        contentLanguage:
            flattenDeep(
                crate.rootDataset?.contentLanguage?.map((l) => {
                    return [l.name, l.alternateName, l.languageCode];
                })
            ) ?? [],
        access: crate.rootDataset?.licence?.[0].name?.[0] ?? "Restricted",
        location: geography,
    };
    // record.languageSuggest = [...record.subjectLanguage, ...record.contentLanguage];
    return record;
}

export function extractGeography({ crate }) {
    let geometries = [];
    for (let entity of crate.entities()) {
        if (entity["@type"].includes("GeoShape") || entity["@type"].includes("GeoCoordinates")) {
            geometries.push(...extractGeometries({ entity }));
        }
    }
    return geometries;
}

// bad geography on a single entity must not stop the whole item being indexed
function extractGeometries({ entity }) {
    let geometries = [];
    for (let source of compact(flattenDeep([entity.geojson]))) {
        let geojson;
        try {
            geojson = JSON.parse(source);
        } catch (error) {
            log.warn(`Ignoring unparseable geojson on '${entity["@id"]}': ${error.message}`);
            continue;
        }
        const features = geojson?.type === "FeatureCollection" ? geojson.features ?? [] : [geojson];
        for (let feature of features) {
            const geometry = feature?.geometry ?? feature;
            if (!isString(geometry?.type) || !isArray(geometry?.coordinates)) {
                log.warn(`Ignoring geojson without a geometry on '${entity["@id"]}'`);
                continue;
            }
            geometry.coordinates = parseValuesAsFloat(geometry.coordinates);
            const type = geometry.type.toLowerCase();
            if (type === "polygon") closeRings(geometry.coordinates);
            if (type === "multipolygon") geometry.coordinates.forEach(closeRings);
            geometries.push(geometry);
        }
    }
    return geometries;
}

// elasticsearch rejects polygons whose rings aren't explicitly closed
function closeRings(rings) {
    for (let ring of rings) {
        const [first, last] = [ring[0], ring.at(-1)];
        if (!first) continue;
        if (first[0] !== last[0] || first[1] !== last[1]) ring.push([...first]);
    }
}

function parseValuesAsFloat(arr) {
    return arr.map((v) => (isArray(v) ? parseValuesAsFloat(v) : parseFloat(v)));
}

// TODO this method does not have tests
export function assembleEntityLookupRecords({ crate }) {
    let entities = [];
    for (let entity of crate.entities()) {
        if (["ro-crate-metadata.json", "./"].includes(entity["@id"])) continue;

        entity = entity.toJSON();
        if (!isArray(entity["@type"])) entity["@type"] = [entity["@type"]];

        // we don't index all types in the crate
        let skipEntity = false;
        for (let type of typesToExcludeFromIndex) {
            if (entity["@type"].includes(type)) skipEntity = true;
        }
        if (skipEntity) continue;

        //  walk the entity and remove links to other things
        for (let property of Object.keys(entity)) {
            if (!isArray(entity[property]) && !isPlainObject(entity[property])) continue;
            if (isPlainObject(entity[property])) entity[property] = [entity[property]];
            entity[property] = entity[property].filter((instance) => isString(instance));
            if (!entity[property].length) delete entity[property];
        }
        entities.push(entity);
    }
    return entities;
}

export async function extractText({ configuration, content }) {
    const form = new FormData();
    form.append("source", content, "file.xml");
    try {
        // post the form data and retrieve a response containing a <directory> XML document, containing a list of <file> elements
        const response = await fetch(
            `${configuration.api.services.xml.host}/nyingarn/extract-text`,
            {
                method: "POST",
                body: form,
            }
        );
        if (response.ok) {
            // xml web service returned XML successfully
            const text = await response.text();
            return text;
        } else {
            // xml web service returned an error; entity will be a JSON representation of the error
            const json = await response.json();
            throw json;
        }
    } catch (error) {
        console.log(error);
        // throw await expandError(error); // expand the error using the error-definitions file, and throw the expanded error
    }
}
