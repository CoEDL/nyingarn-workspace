import { ForbiddenError } from "restify-errors";
import { log } from "./";
import { loadConfiguration } from "../../common";
import { lookupItemByIdentifier } from "../../lib/item";
import { processThumbnails, processOcr, processWebFormats } from "../../lib/data";

export async function authenticateTusRequest(req, res, next) {
    if (!req.session.user.upload) {
        return next(new UnauthorizedError());
    }
    res.send({});
    next();
}

export async function triggerProcessing(req, res, next) {
    // await new Promise((resolve) => setTimeout(resolve, 15000));
    const identifier = req.params.identifier;
    const headers = {
        "content-type": "application/json",
        authorization: req.headers.authorization,
    };

    const item = await lookupItemByIdentifier({ userId: req.session.user.id, identifier });
    if (!item) {
        return next(new ForbiddenError());
    }

    // look up tasks table for a processing job on this identifier that is in progress
    //   if one exists return immediately
    let configuration = await loadConfiguration();
    log.debug(`trigger processing for ${identifier}: ${configuration.api.processing.actions}`);

    let stages = req.body?.stages;
    if (!stages) stages = Object.keys(configuration.api.processing.stages);
    for (let stage of stages) {
        switch (stage) {
            case "/process/thumbnails":
                await processThumbnails({
                    userId: req.session.user.id,
                    identifier: identifier,
                    stages: configuration.api.processing.stages[stage],
                    headers,
                });
                break;
            case "/process/webformats":
                await processWebFormats({
                    userId: req.session.user.id,
                    identifier: identifier,
                    stages: configuration.api.processing.stages[stage],
                    headers,
                });
                break;
            case "/process/ocr":
                await processOcr({
                    userId: req.session.user.id,
                    identifier: identifier,
                    stages: configuration.api.processing.stages[stage],
                    headers,
                });
                break;
        }
    }

    res.send({});
    next();
}
