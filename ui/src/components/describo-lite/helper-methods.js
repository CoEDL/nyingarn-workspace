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
        // mark root dataset
        const rootDescriptor = this.rootDescriptor;
        this.graph = this.graph.map((e) => {
            return e["@id"] === rootDescriptor.about["@id"]
                ? { describoLabel: "RootDataset", ...e }
                : e;
        });

        // for each entity, populate entities and properties structs
        let entities = this.graph.map((entity) => {
            return this.__addEntity({ entity });
        });
        this.__index();

        entities.forEach((entity) => {
            this.__processProperties({ entity });
        });
        delete this.graph;
    }

    exportCrate() {
        let crate = {
            "@context": cloneDeep(this.context),
            "@graph": [cloneDeep(this.rootDescriptor)],
        };
        this.entities.forEach((entity) => {
            // map in the entity properties
            let properties = this.getEntityProperties({ describoId: entity.describoId });
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
            let reverseProperties = this.getEntityReverseConnections({
                describoId: entity.describoId,
            });
            reverseProperties = groupBy(reverseProperties, "property");
            for (let property of Object.keys(reverseProperties)) {
                entity["@reverse"][property] = [];
                reverseProperties[property].forEach((instance) => {
                    let referencedEntity = this.entitiesByDescriboId[instance.srcEntityId][0];
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

    getEntity({ id, describoId }) {
        let entity;
        if (id) entity = this.__lookupEntityByAtId({ id });
        if (describoId) entity = this.__lookupEntityByDescriboId({ id: describoId });
        if (entity?.describoId) {
            entity.properties = this.getEntityProperties({
                describoId: entity.describoId,
            }).map((c) => {
                if (c.tgtEntityId && c.tgtEntityId !== "not found") {
                    return {
                        ...c,
                        tgtEntity: this.__lookupEntityByDescriboId({ id: c.tgtEntityId }),
                    };
                } else {
                    return c;
                }
            });
            entity.reverseConnections = this.getEntityReverseConnections({
                describoId: entity.describoId,
            }).map((c) => {
                if (c.tgtEntityId && c.tgtEntityId !== "not found") {
                    return {
                        ...c,
                        tgtEntity: this.__lookupEntityByDescriboId({ id: c.tgtEntityId }),
                    };
                } else {
                    return c;
                }
            });
        }
        return entity;
    }

    getEntityProperties({ describoId }) {
        return this.properties.filter((p) => p.srcEntityId === describoId);
    }

    getEntityReverseConnections({ describoId }) {
        return this.properties.filter((p) => p.tgtEntityId === describoId);
    }

    addEntity({ entity }) {
        // check there isn't an entity wth that @id already
        let matches = this.__lookupEntityByAtId({ id: entity["@id"] });
        if (matches) {
            return matches.shift();
        } else {
            //  if not
            entity = this.__addEntity({ entity });
            this.__processProperties({ entity });
            this.__index();
            return this.getEntity({ describoId: entity.describoId });
        }
    }

    deleteEntity({ describoId }) {
        this.entities = this.entities.filter((e) => describoId !== this.describoId);
        this.__index();
    }

    updateEntityName({ describoId, value }) {
        this.entities = this.entities.map((e) => {
            return e.describoId === describoId ? { ...e, name: value } : e;
        });
        this.__index();
    }

    addProperty({ describoId, property, value }) {
        this.__pushProperty({ srcEntityId: describoId, property, value });
    }

    updateProperty({ propertyId, value }) {
        this.properties = this.properties.map((p) => {
            return p.propertyId == propertyId ? { ...p, value } : p;
        });
    }

    deleteProperty({ propertyId }) {
        this.properties = this.properties.filter((p) => p.propertyId !== propertyId);
    }

    linkEntity({ srcEntityId, property, tgtEntityId }) {
        let existingLink = this.properties.filter(
            (p) =>
                p.property === property &&
                p.srcEntityId === srcEntityId &&
                p.tgtEntityId === tgtEntityId
        );
        if (!existingLink.length) {
            this.__pushProperty({ srcEntityId, property, tgtEntityId });
        }
    }

    unlinkEntity({ srcEntityId, property, tgtEntityId }) {
        this.properties = this.properties.filter(
            (p) =>
                !(
                    p.property === property &&
                    p.srcEntityId === srcEntityId &&
                    p.tgtEntityId === tgtEntityId
                )
        );
    }

    __index() {
        this.entitiesByAtId = groupBy(this.entities, "@id");
        this.entitiesByType = groupBy(this.entities, "@type");
        this.entitiesByDescriboId = groupBy(this.entities, "describoId");
    }

    __addEntity({ entity }) {
        entity = { describoId: uuid(), ...entity };
        let e = this.coreProperties
            .map((p) => ({ [p]: entity[p] }))
            .reduce((obj, entry) => ({ ...obj, ...entry }));
        this.entities.push(e);
        return entity;
    }

    __processProperties({ entity }) {
        const pushProperty = this.__pushProperty.bind(this);

        for (let prop of Object.keys(entity)) {
            if (this.coreProperties.includes(prop)) continue;

            if (isString(entity[prop])) {
                pushProperty({
                    srcEntityId: entity.describoId,
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
                            srcEntityId: entity.describoId,
                            property: prop,
                            value: instance,
                        });
                    } else if (isPlainObject(instance)) {
                        if ("@id" in instance) {
                            let targetEntity = this.__lookupEntityByAtId({ id: instance["@id"] });
                            pushProperty({
                                srcEntityId: entity.describoId,
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

    __pushProperty({ srcEntityId, property, value, tgtEntityId }) {
        this.properties.push({ propertyId: uuid(), srcEntityId, property, value, tgtEntityId });
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
