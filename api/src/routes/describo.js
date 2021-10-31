import { loadConfiguration } from "../common";
import { route } from "../common";
import { BadRequestError } from "restify-errors";
import fetch from "node-fetch";

export function setupRoutes({ server }) {
    server.post("/describo", route(setupDescriboSessionRouteHandler));
}

async function setupDescriboSessionRouteHandler(req, res, next) {
    let configuration = await loadConfiguration();
    const describo = configuration.api.services.describo;
    const s3 = configuration.api.services.s3;
    const user = req.session.user;
    const folder = `${s3.bucket}/${req.body.folder}`;
    let url = `${describo.url}/api/session/application`;
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
        return next(new BadRequestError(`There was an issue setting up a describo session`));
    }
    const sessionId = (await response.json()).sessionId;
    res.send({ url: `${describo.url}/application?sid=${sessionId}` });
    next();
}
