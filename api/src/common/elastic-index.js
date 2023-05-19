import { loadConfiguration } from "./index.js";
import lodashPkg from "lodash";
const { isArray, isString, isPlainObject } = lodashPkg;
import { Client } from "@elastic/elasticsearch";
import { ROCrate } from "ro-crate";

export async function indexItem({ item, crate }) {
    let configuration = await loadConfiguration();
    crate = new ROCrate(crate, { array: true, link: true });
    let document = crate.getTree({ valueObject: false });
    const indexIdentifier = `/${item.type}/${item.identifier}`;

    const client = new Client({
        node: configuration.api.services.elastic.host,
    });

    // ensure we have all of the indices we need
    try {
        await client.indices.get({ index: "metadata" });
    } catch (error) {
        await client.indices.create({
            index: "metadata",
            settings: { "index.mapping.ignore_malformed": true },
        });
    }
    try {
        await client.indices.get({ index: "data" });
    } catch (error) {
        await client.indices.create({ index: "data" });
    }

    await client.index({
        index: "metadata",
        id: indexIdentifier,
        document,
    });

    for (let entity of crate.entities()) {
        if (!["ro-crate-metadata.json", "./"].includes(entity["@id"])) {
            if (!isArray(entity["@type"])) entity["@type"] = [entity["@type"]];

            entity = entity.toJSON();
            if (!isArray(entity["@type"])) entity["@type"] = [entity["@type"]];
            for (let type of entity["@type"]) {
                //  walk the entity and remove links to other things
                for (let property of Object.keys(entity)) {
                    if (!isArray(entity[property]) && !isPlainObject(entity[property])) continue;
                    if (isPlainObject(entity[property])) entity[property] = [entity[property]];
                    entity[property] = entity[property].filter((instance) => isString(instance));
                    if (!entity[property].length) delete entity[property];
                }
                await client.index({
                    index: "data",
                    id: `${entity["@id"]}`,
                    document: entity,
                });
            }
        }
    }
}
