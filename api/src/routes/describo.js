import { loadConfiguration } from "../common";
import { route } from "../common";
import { BadRequestError } from "restify-errors";
import fetch from "node-fetch";

export function setupRoutes({ server }) {
    server.post("/describo", route(setupDescriboSessionRouteHandler));
    server.post("/describo/update", route(postDescriboUpdateRouteHandler));
}

async function setupDescriboSessionRouteHandler(req, res, next) {
    let describo, sessionId;
    try {
        ({ describo, sessionId } = await __setupDescriboSession({
            session: req.session,
            folder: req.body.folder,
        }));
    } catch (error) {
        return next(new BadRequestError(`There was a problem setting up a describo session`));
    }
    res.send({ url: `${describo.url}/application?sid=${sessionId}` });
    next();
}

async function __setupDescriboSession({ session, folder }) {
    const configuration = await loadConfiguration();
    const describo = configuration.api.services.describo;
    const s3 = configuration.api.services.s3;
    const user = session.user;
    folder = `${s3.bucket}/${folder}`;
    const url = `${describo.url}/api/session/application`;
    const body = {
        name: `${user.givenName} ${user.familyName}`,
        email: user.email,
        session: {
            s3: {
                provider: s3.provider,
                url: s3.endpointUrl,
                awsAccessKeyId: s3.awsAccessKeyId,
                awsSecretAccessKey: s3.awsSecretAccessKey,
                region: s3.region,
                folder,
            },
        },
        profile: {
            file: "nyingarn-profile.json",
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
        throw new Error(`There was an issue setting up a describo session`);
    }
    const sessionId = (await response.json()).sessionId;
    return { describo, sessionId, folder };
}

async function postDescriboUpdateRouteHandler(req, res, next) {
    for (const update of ["source", "target"]) {
        let describo, folder, sessionId;
        folder = req.body.updates[update].identifier;
        try {
            ({ describo, sessionId, folder } = await __setupDescriboSession({
                session: req.session,
                folder,
            }));
        } catch (error) {
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
            return next(
                new BadRequestError(`Describo is unable to add those entities to the collection`)
            );
        }
    }
    res.send({});
    next();
}
