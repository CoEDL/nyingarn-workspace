import { loadConfiguration } from "./index.js";
import lodashPkg from "lodash";
const { isArray, isString, isPlainObject, flattenDeep } = lodashPkg;
import { Client } from "@elastic/elasticsearch";
import { ROCrate } from "ro-crate";
const typesToExcludeFromIndex = ["File", "GeoShape", "GeoCoordinates", "Language"];

export async function indexItem({ configuration, item, crate }) {
    // let configuration = await loadConfiguration();
    // console.log(configuration);
    // console.log(item);
    // console.log(crate);
    crate = new ROCrate(crate, { array: true, link: true });
    // let document = crate.getTree({ valueObject: false });

    const client = new Client({
        node: configuration.api.services.elastic.host,
    });

    // setup the metadata index
    try {
        // await client.indices.delete({ index: "metadata" });
        await client.indices.get({ index: "metadata" });
    } catch (error) {
        await client.indices.create({
            index: "metadata",
            settings: { "index.mapping.ignore_malformed": true },
        });
    }

    const indexIdentifier = `/${item.type}/${item.identifier}`;
    const document = assembleIndexRecord({ crate });
    // console.log(document);
    await client.index({
        index: "metadata",
        id: indexIdentifier,
        document,
    });

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
    // console.log(record);
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
    const geography = entities.map((entity) => {
        if (entity?.geojson?.length) {
            let geojson = JSON.parse(entity.geojson[0]);

            let coordinates = geojson?.geometry?.coordinates.map((e) => {
                if (isString(e)) return parseFloat(e);
                if (isArray(e)) {
                    return [
                        e.map((c) => {
                            return parseFloat(c);
                        }),
                    ];
                }
            });
            // console.log(JSON.stringify(coordinates, null, 2));
            return coordinates;
        }
    });

    // console.log(JSON.stringify(geography, null, 2));

    return geography;

    // const feature = {
    //     type: "Feature",
    //     properties: { name: "Yorta Yorta" },
    //     geometry: { type: "Point", coordinates: [145.26357989848, -36.093929709321] },
    // };

    // const feature = {
    //     type: "Feature",
    //     geometry: {
    //         type: "Polygon",
    //         coordinates: [
    //             [
    //                 [144.56249892711642, -27.126287638023676],
    //                 [144.56249892711642, -29.486150057382325],
    //                 [138.27831923961642, -29.486150057382325],
    //                 [138.27831923961642, -27.126287638023676],
    //             ],
    //         ],
    //     },
    // };
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
