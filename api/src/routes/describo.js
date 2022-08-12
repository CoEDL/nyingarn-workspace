import { loadConfiguration, getLogger } from "../common";
import { route, getStoreHandle } from "../common";
import { BadRequestError } from "restify-errors";
import fetch from "node-fetch";
import models from "../models";
const log = getLogger();

export function setupRoutes({ server }) {
    server.post("/describo", route(setupDescriboSessionRouteHandler));
    server.post("/describo/update", route(postDescriboUpdateRouteHandler));
}

async function setupDescriboSessionRouteHandler(req, res, next) {
    let describo, sessionId;
    let store = await getStoreHandle({ className: req.body.type, id: req.body.identifier });
    try {
        ({ describo, sessionId } = await __setupDescriboSession({
            session: req.session,
            folder: store.getItemPath(),
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
