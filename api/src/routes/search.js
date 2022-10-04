import { route, getLogger, loadConfiguration } from "../common";
import fetch from "cross-fetch";
const log = getLogger();

export function setupRoutes({ server }) {
    server.post("/search/datapacks", route(postSearchDataPacksHandler));
}

// TODO: this code does not have tests
async function postSearchDataPacksHandler(req, res, next) {
    const configuration = await loadConfiguration();
    let response = await fetch(`${configuration.api.services.elastic.host}/_search`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(req.body.query),
    });
    response = await response.json();
    res.send(response);
    next();
}
