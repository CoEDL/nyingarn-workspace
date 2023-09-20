import { getStoreHandle } from "./index.js";
import lodashPkg from "lodash";
const { isArray, isString, isPlainObject, flattenDeep } = lodashPkg;
import fsExtraPkg from "fs-extra";
const { createReadStream } = fsExtraPkg;
import { Client } from "@elastic/elasticsearch";
import { ROCrate } from "ro-crate";
// import { FormData, File, Blob } from "formdata-node";
// import { Buffer } from "node:buffer";
import FormData from "form-data";
import fetch from "cross-fetch";

const typesToExcludeFromIndex = ["File", "GeoShape", "GeoCoordinates"];

export async function indexItem({ location = "workspace", configuration, item, crate }) {
    crate = new ROCrate(crate, { array: true, link: true });
    // let document = crate.getTree({ valueObject: false });

    const client = new Client({
        node: configuration.api.services.elastic.host,
    });

    // setup the metadata index
    try {
        // await client.indices.delete({ index: "manuscripts" });
        await client.indices.get({ index: "manuscripts" });
    } catch (error) {
        await client.indices.create({
            index: "manuscripts",
            mappings: {
                properties: {
                    location: {
                        type: "geo_shape",
                    },
                    // languageSuggest: {
                    //     type: "completion",
                    // },
                },
            },
            settings: { "index.mapping.ignore_malformed": true },
        });
    }

    // index the item metadata and content
    const indexIdentifier = `/${item.type}/${item.identifier}`;
    try {
        let store = await getStoreHandle({ location, id: item.identifier, type: "item" });
        const teiFileContent = await store.get({
            target: `${item.identifier}-tei-complete.xml`,
        });
        let teiText = await extractText({
            configuration,
            content: teiFileContent,
        });
        const document = assembleIndexRecord({ crate });
        document.text = teiText;
        await client.index({
            index: "manuscripts",
            id: indexIdentifier,
            document,
        });
        // console.log(document);
    } catch (error) {
        console.log(error);
    }
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

export async function deleteItemFromIndex({ item, configuration }) {
    const client = new Client({
        node: configuration.api.services.elastic.host,
    });

    const indexIdentifier = `/${item.type}/${item.identifier}`;
    await client.delete({
        index: "metadata",
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

// TODO this method does not have tests
export function extractGeography({ crate }) {
    let entities = [];
    for (let entity of crate.entities()) {
        if (entity["@type"].includes("GeoShape") || entity["@type"].includes("GeoCoordinates")) {
            entities.push(entity);
        }
    }

    entities.push({
        "@id": "test",
        "@type": ["GeoShape"],
        name: "aaa",
        geojson: [
            '{"type":"Feature","geometry":{"type":"Polygon","coordinates":[[[58.07810783386231,29.095852076791065],[58.07810783386231,-19.12303093039881],[11.671857833862305,-19.12303093039881],[11.671857833862305,29.095852076791065]]]}}',
        ],
    });
    const coordinates = flattenDeep(entities.map((e) => JSON.parse(e.geojson).geometry)).map(
        (feature) => {
            feature.coordinates = feature.coordinates.map((c) => {
                if (isString(c)) return parseFloat(c);
                if (isArray(c)) {
                    return [
                        c.map((d) => {
                            return parseFloat(d);
                        }),
                    ];
                }
            });
            return feature;
        }
    );
    return coordinates;
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
