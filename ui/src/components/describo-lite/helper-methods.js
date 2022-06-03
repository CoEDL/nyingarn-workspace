import { v4 as uuid } from "uuid";
import { isString, isArray, isPlainObject, groupBy, cloneDeep } from "lodash";

export function getProfileDefinitionForProperty({ profile, entityType, property }) {
    let entityDefinition = profile.classes[entityType];
    let propertyDefinition = entityDefinition.inputs.filter((p) => p.name === property)[0];
    return propertyDefinition;
}

export class CrateManager {
    constructor({ crate }) {
        this.context = crate["@context"];

        // store root descriptor as found
        this.rootDescriptor = crate["@graph"].filter(
            (e) => e["@id"] === "ro-crate-metadata.json" && e["@type"] === "CreativeWork"
        )[0];
        // filter root descriptor from the graph
        this.graph = crate["@graph"].filter(
            (e) => !(e["@id"] === "ro-crate-metadata.json" && e["@type"] === "CreativeWork")
        );

        this.describoProperties = ["describoId", "describoLabel"];
        this.coreProperties = ["describoId", "describoLabel", "@id", "@type", "name"];
        this.entities = [];
        this.properties = [];
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

        // for each entity, populate entities and properties structs
        this.graph.forEach((e) => {
            let entity = this.coreProperties
                .map((p) => ({ [p]: e[p] }))
                .reduce((obj, entry) => ({ ...obj, ...entry }));
            this.entities.push(entity);
        });
        this.entitiesByAtId = groupBy(this.entities, "@id");
        this.entitiesByType = groupBy(this.entities, "@type");
        this.entitiesByDescriboId = groupBy(this.entities, "describoId");

        this.graph.forEach((e) => {
            this.__processProperties({ entity: e });
        });
    }

    exportCrate() {
        let crate = {
            "@context": cloneDeep(this.context),
            "@graph": [cloneDeep(this.rootDescriptor)],
        };
        this.entities.forEach((entity) => {
            // map in the entity properties
            let properties = this.properties.filter((p) => p.entityId === entity.describoId);
            properties = groupBy(properties, "property");
            for (let property of Object.keys(properties)) {
                entity[property] = [];
                properties[property].forEach((instance) => {
                    if (instance.tgtEntityId) {
                        let targetEntity = this.__lookupEntityByDescriboId({
                            id: instance.tgtEntityId,
                        });
                        entity[property].push({
                            "@id": targetEntity ? targetEntity["@id"] : instance.value,
                        });
                    } else {
                        entity[property].push(instance.value);
                    }
                });
                if (entity[property].length === 1) entity[property] = entity[property][0];
            }

            // map in the reverse property links
            entity["@reverse"] = {};
            let reverseProperties = this.properties.filter(
                (p) => p.tgtEntityId === entity.describoId
            );
            reverseProperties = groupBy(reverseProperties, "property");
            for (let property of Object.keys(reverseProperties)) {
                entity["@reverse"][property] = [];
                reverseProperties[property].forEach((instance) => {
                    let referencedEntity = this.entitiesByDescriboId[instance.entityId][0];
                    entity["@reverse"][property].push({ "@id": referencedEntity["@id"] });
                });
                if (entity["@reverse"][property].length === 1)
                    entity["@reverse"][property] = entity["@reverse"][property][0];
            }

            this.describoProperties.forEach((p) => delete entity[p]);
            crate["@graph"].push(entity);
        });
        return crate;
    }

    getRootDataset() {
        return this.entities.filter((e) => e.describoLabel === "RootDataset")[0];
    }

    __processProperties({ entity }) {
        const pushProperty = this.__pushProperty.bind(this);

        for (let prop of Object.keys(entity)) {
            if (this.coreProperties.includes(prop)) continue;

            if (isString(entity[prop])) {
                pushProperty({
                    entityId: entity.describoId,
                    propertyId: uuid(),
                    property: prop,
                    value: entity[prop],
                });
            } else if (isPlainObject(entity[prop])) {
                entity[prop] = [entity[prop]];
            }

            if (isArray(entity[prop])) {
                entity[prop].forEach((instance) => {
                    if (isString(instance)) {
                        pushProperty({
                            entityId: entity.describoId,
                            propertyId: uuid(),
                            property: prop,
                            value: instance,
                        });
                    } else if (isPlainObject(instance)) {
                        if ("@id" in instance) {
                            let targetEntity = this.__lookupEntityByAtId({ id: instance["@id"] });
                            pushProperty({
                                entityId: entity.describoId,
                                propertyId: uuid(),
                                property: prop,
                                value: instance["@id"],
                                tgtEntityId: targetEntity?.describoId || "not found",
                            });
                        }
                    }
                });
            }
        }
    }

    __pushProperty({ entityId, propertyId, property, value, tgtEntityId }) {
        this.properties.push({ entityId, propertyId, property, value, tgtEntityId });
    }

    __lookupEntityByAtId({ id }) {
        let targetEntity = cloneDeep(this.entitiesByAtId[id]);
        if (targetEntity?.length) return targetEntity.shift();
    }

    __lookupEntityByDescriboId({ id }) {
        let targetEntity = cloneDeep(this.entitiesByDescriboId[id]);
        if (targetEntity?.length) return targetEntity.shift();
    }
}
