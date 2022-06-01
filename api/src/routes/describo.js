import { loadConfiguration, getLogger } from "../common";
import { route, getS3Handle } from "../common";
import { BadRequestError } from "restify-errors";
import path from "path";
import fetch from "node-fetch";
import models from "../models";
const log = getLogger();

export function setupRoutes({ server }) {
    server.post("/describo", route(setupDescriboSessionRouteHandler));
    server.post("/describo/update", route(postDescriboUpdateRouteHandler));
    server.get("/describo/rocrate/:type/:identifier", route(getDescriboROCrate));
    server.post("/describo/rocrate/:type/:identifier", route(postDescriboROCrate));
    server.get("/describo/profile/:type", route(getDescriboProfile));
}

async function setupDescriboSessionRouteHandler(req, res, next) {
    let describo, sessionId;
    try {
        ({ describo, sessionId } = await __setupDescriboSession({
            session: req.session,
            folder: req.body.folder,
            type: req.body.type,
        }));
    } catch (error) {
        log.error(`There was a problem setting up a describo session: ${error.message}`);
        return next(new BadRequestError(`There was a problem setting up a describo session`));
    }
    res.send({ url: `${describo.url}/application?sid=${sessionId}` });
    next();
}

async function __setupDescriboSession({ session, folder, type = "item" }) {
    const configuration = await loadConfiguration();
    const describo = configuration.api.services.describo;
    const s3 = configuration.api.services.s3;
    const user = session.user;
    folder = `${s3.bucket}/${folder}`;
    const url = `${describo.url}/api/session/application`;
    const body = {
        name: `${user.givenName} ${user.familyName}`,
        email: user.email,
        service: {
            s3: {
                provider: s3.provider,
                url: s3.endpointUrl,
                awsAccessKeyId: s3.awsAccessKeyId,
                awsSecretAccessKey: s3.awsSecretAccessKey,
                region: s3.region,
                folder,
            },
        },
        configuration: {
            allowProfileChange: false,
            allowServiceChange: false,
        },
        profile: {
            file: configuration.api.profiles[type],
        },
    };
    let response = await fetch(url, {
        method: "POST",
        headers: {
            authorization: `Bearer ${describo.authorization}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    });
    if (response.status !== 200) {
        log.error(`There was a problem setting up a describo session: ${error.message}`);
        throw new Error(`There was a problem setting up a describo session`);
    }
    const sessionId = (await response.json()).sessionId;
    return { describo, sessionId, folder };
}

async function postDescriboUpdateRouteHandler(req, res, next) {
    let src = req.body.updates.source;
    let tgt = req.body.updates.target;
    let source, target;
    if (src.type === "collection") {
        source = await models.collection.findOne({ where: { identifier: src.identifier } });
        if (tgt.type === "collection") {
            target = await models.collection.findOne({ where: { identifier: tgt.identifier } });
            await source.addSubCollection(target);
        } else {
            target = await models.item.findOne({ where: { identifier: tgt.identifier } });
            await source.addItem(target);
        }
    } else if (src.type === "item") {
        source = await models.item.findOne({ where: { identifier: src.identifier } });
        target = await models.collection.findOne({ where: { identifier: tgt.identifier } });
        await source.addCollection(target);
    }

    // console.log(JSON.stringify(req.body.updates, null, 2));

    for (const update of ["source", "target"]) {
        let describo, folder, sessionId;
        folder = req.body.updates[update].identifier;
        try {
            ({ describo, sessionId, folder } = await __setupDescriboSession({
                session: req.session,
                folder,
                type: req.body.type,
            }));
        } catch (error) {
            log.error(`There was a problem setting up a describo session: ${error.message}`);
            return next(new BadRequestError(`There was a problem setting up a describo session`));
        }

        let response = await fetch(`${describo.url}/api/load/s3`, {
            method: "GET",
            headers: {
                Authorization: `sid ${sessionId}`,
                "Content-Type": "application/json",
            },
        });
        if (response.status !== 200) {
            console.log(error);
            log.error(`Describo is unable to load that collection: ${error.message}`);
            return next(new BadRequestError(`Describo is unable to load that collection`));
        }

        response = await fetch(`${describo.url}/api/session/entities`, {
            method: "POST",
            headers: {
                Authorization: `sid ${sessionId}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(req.body.updates[update].entities),
        });
        if (response.status !== 200) {
            log.error(
                `Describo is unable to add those entities to the collection: ${error.message}`
            );
            return next(
                new BadRequestError(`Describo is unable to add those entities to the collection`)
            );
        }
    }
    res.send({});
    next();
}

// TODO: this code does not have tests
async function getDescriboROCrate(req, res, next) {
    let { bucket } = await getS3Handle();

    let rocrateFile = path.join(req.params.identifier, "ro-crate-metadata.json");
    let pathExists = await bucket.pathExists({ path: rocrateFile });
    if (pathExists) {
        rocrateFile = JSON.parse(await bucket.download({ target: rocrateFile }));
    } else {
        rocrateFile = createDefaultROCrateFile({ identifier: req.params.identifier });
    }
    res.send({ rocrateFile });
    next();
}

// TODO: this code does not have tests
async function postDescriboROCrate(req, res, next) {
    res.send({});
    next();
}

// TODO: this code does not have tests
async function getDescriboProfile(req, res, next) {
    let profile = getDefaultProfile();
    res.send({ profile });
    next();
}

function createDefaultROCrateFile({ identifier }) {
    let context = ["https://w3id.org/ro/crate/1.1/context"];
    let graph = [
        {
            "@id": "ro-crate-metadata.json",
            "@type": "CreativeWork",
            conformsTo: {
                "@id": "https://w3id.org/ro/crate/1.1/context",
            },
            about: {
                "@id": "./",
            },
        },
        {
            "@id": "./",
            "@type": "Dataset",
            name: identifier,
        },
    ];
    return {
        "@context": context,
        "@graph": graph,
    };
}

function getDefaultProfile() {
    return {
        metadata: {
            name: "Describo Test Profile",
            description: "A profile with entries for each of the supported datatypes",
            version: 0.1,
            warnMissingProperty: true,
        },
        classes: {
            Dataset: {
                definition: "override",
                subClassOf: [],
                inputs: [
                    {
                        id: "https://schema.org/location",
                        name: "location",
                        label: "Attach a location",
                        help: "",
                        type: ["Geo"],
                        required: true,
                        multiple: false,
                    },
                    {
                        id: "https://schema.org/entity",
                        name: "entity",
                        label: "Attach Entity",
                        help: "",
                        type: ["Person", "Organisation"],
                        required: true,
                        multiple: true,
                    },
                    {
                        id: "https://schema.org/text",
                        name: "text",
                        label: "Text",
                        help: "",
                        type: ["Text"],
                        required: true,
                        multiple: false,
                    },
                    {
                        id: "https://schema.org/textarea",
                        name: "TextArea",
                        label: "TextArea",
                        help: "",
                        type: ["TextArea"],
                        required: true,
                        multiple: false,
                    },
                    {
                        id: "http://schema.org/url",
                        name: "url",
                        label: "URL",
                        help: "",
                        multiple: true,
                        type: ["URL"],
                    },
                    {
                        id: "http://schema.org/date",
                        name: "date",
                        label: "Date",
                        help: "",
                        multiple: true,
                        type: ["Date"],
                    },
                    {
                        id: "http://schema.org/datetime",
                        name: "datetime",
                        label: "DateTime",
                        help: "",
                        multiple: true,
                        type: ["DateTime"],
                    },
                    {
                        id: "http://schema.org/select-text",
                        name: "select-text",
                        label: "Select Text",
                        help: "",
                        multiple: true,
                        type: ["Select"],
                        values: ["http://schema.org/Person", "http://schema.org/Organisation"],
                    },
                    {
                        id: "http://schema.org/select-url",
                        name: "select-url",
                        label: "Select Url",
                        help: "Language name in non-standard form",
                        type: ["SelectURL"],
                        multiple: true,
                        values: ["http://schema.org/Person", "http://schema.org/Organisation"],
                    },
                ],
            },
            Person: {
                definition: "override",
                subClassOf: [],
                inputs: [
                    {
                        id: "https://schema.org/name",
                        name: "name",
                        label: "name",
                        help: "The name the person",
                        required: true,
                        multiple: false,
                        type: ["Text"],
                    },
                ],
            },
            Organisation: {
                definition: "override",
                subClassOf: [],
                inputs: [
                    {
                        id: "https://schema.org/name",
                        name: "name",
                        label: "name",
                        help: "The name of the organisation",
                        required: true,
                        multiple: false,
                        type: ["Text"],
                    },
                ],
            },
        },
        enabledClasses: ["Dataset", "Person", "Organisation"],
    };
}
