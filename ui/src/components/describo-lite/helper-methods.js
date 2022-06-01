import { v4 as uuid } from "uuid";

export function getRootDataset({ crate }) {
    let rootDescriptor = crate.filter(
        (e) => e["@id"] === "ro-crate-metadata.json" && e["@type"] === "CreativeWork"
    )[0];
    return crate.filter((e) => e["@id"] === rootDescriptor.about["@id"])[0];
}

export function convertCrateToDatabase({ crate }) {
    let entities = [];
    let properties = [];

    // assign describoId to all entities
    let graph = crate["@graph"].map((e) => ({ describoId: uuid(), ...e }));

    // mark root dataset
    let rootDataset = getRootDataset({ crate: graph });
    graph = graph.map((e) => {
        if (e["@id"] === rootDataset["@id"]) {
            return { describoLabel: "RootDataset", ...e };
        } else {
            return e;
        }
    });

    // filter out root descriptor
    let rootDescriptor;
    graph = graph.filter(
        (e) => !(e["@id"] === "ro-crate-metadata.json" && e["@type"] === "CreativeWork")
    );

    console.log(graph);
    // filter out root descriptor
    // for (let entity of crate["@graph"]) {
    //     for (let property of Object.keys(entity)) {
    //         console.log(property, JSON.stringify(entity[property]));
    //     }
    // }
}

export function getProfileDefinitionForProperty({ profile, entityType, property }) {
    let entityDefinition = profile.classes[entityType];
    let propertyDefinition = entityDefinition.inputs.filter((p) => p.name === property)[0];
    return propertyDefinition;
}

export function saveProperty({ crate, entity, data }) {
    console.debug("saveProperty", JSON.stringify(data, null, 2));
    // find the relevant entity in the crate
    let updatedEntity = data.crate.filter((e) => e.describoId === data.entity.describoId)[0];
    updatedEntity[data.property];
}

export class CrateManager {
    constructor({ crate }) {
        this.context = crate["@context"];

        // filter root descriptor from the graph
        this.graph = crate["@graph"].filter(
            (e) => !(e["@id"] === "ro-crate-metadata.json" && e["@type"] === "CreativeWork")
        );

        // but store it for later
        this.rootDescriptor = crate["@graph"].filter(
            (e) => e["@id"] === "ro-crate-metadata.json" && e["@type"] === "CreativeWork"
        )[0];
    }

    init() {
        // assign describoId to all entities
        this.graph = this.graph.map((e) => ({ describoId: uuid(), ...e }));

        // mark root dataset
        const rootDescriptor = this.rootDescriptor;
        this.graph = this.graph.map((e) => {
            return e["@id"] === rootDescriptor.about["@id"]
                ? { describoLabel: "RootDataset", ...e }
                : e;
        });

        console.log(this.graph);
    }
}
