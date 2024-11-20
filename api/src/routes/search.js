import { demandAuthenticatedUser } from "../common/middleware.js";
import fetch from "cross-fetch";
import { Client } from "@elastic/elasticsearch";


export function setupRoutes(fastify, options, done) {
    fastify.addHook("preHandler", demandAuthenticatedUser);

    fastify.post("/search/:index", postSearchDataPacksHandler);
    fastify.get("/search-synonyms", getSearchSynonyms);
    fastify.post("/search-synonyms", setSearchSynonyms);
    done();
}

// TODO: this code does not have tests
async function postSearchDataPacksHandler(req) {
    const configuration = req.session.configuration;
    const { index } = req.params;
    let response = await fetch(`${configuration.api.services.elastic.host}/${index}/_search`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(req.body.query),
    });
    response = await response.json();
    return response;
}

async function setSearchSynonyms(req) {
    const client = new Client({
        node: req.session.configuration.api.services.elastic.host,
    });

    let synonyms = req.body
        .replace(new RegExp("\#.*$"),"")
        .split("\n")
        .filter(rule => !rule.trim() == "")

    let response = await client.synonyms.putSynonym({
        id: "nyingarn-synonyms",
        synonyms_set: synonyms.map(rule => ({synonyms: rule.trim()}))
    });

    response = response.result
    return response;
}

async function getSearchSynonyms(req) {
    const client = new Client({
        node: req.session.configuration.api.services.elastic.host,
    });

    const response = await client.synonyms.getSynonym({
        id: "nyingarn-synonyms",
        size: 2000
    })

    return response.synonyms_set.map(x => x.synonyms).join("\n")
}
