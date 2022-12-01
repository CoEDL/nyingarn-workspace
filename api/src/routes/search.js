import { demandAuthenticatedUser, loadConfiguration } from "../common/index.js";
import fetch from "cross-fetch";

export function setupRoutes(fastify, options, done) {
    fastify.addHook("preHandler", demandAuthenticatedUser);

    fastify.post("/search/datapacks", postSearchDataPacksHandler);
    done();
}

// TODO: this code does not have tests
async function postSearchDataPacksHandler(req) {
    const configuration = req.session.configuration;
    let response = await fetch(`${configuration.api.services.elastic.host}/_search`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(req.body.query),
    });
    response = await response.json();
    return response;
}
