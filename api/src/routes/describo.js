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
    const user = req.session.user;
    const folder = `${describo.bucket}/${req.body.folder}`;
    let url = `${describo.describoUrl}/api/session/application`;
    const body = {
        name: `${user.givenName} ${user.familyName}`,
        email: user.email,
        session: {
            s3: {
                provider: describo.provider,
                url: describo.url,
                awsAccessKeyId: describo.awsAccessKeyId,
                awsSecretAccessKey: describo.awsSecretAccessKey,
                region: describo.region,
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
    res.send({ url: `${describo.describoUrl}/application?sid=${sessionId}` });
    next();
}
