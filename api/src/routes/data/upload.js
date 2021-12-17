import { ForbiddenError } from "restify-errors";
import { log } from "./";
import { submitTask } from "../../common";
import { lookupItemByIdentifier } from "../../lib/item";

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
    const resource = req.params.resource;
    const headers = {
        "content-type": "application/json",
        authorization: req.headers.authorization,
    };

    const item = await lookupItemByIdentifier({ userId: req.session.user.id, identifier });
    if (!item) {
        return next(new ForbiddenError());
    }

    log.info(`Process: ${identifier}/${resource}`);
    if (resource.match(/digivol\.csv/)) {
        // process digivol file
        submitTask({
            name: "process-digivol",
            item,
            body: { resource },
        });
    } else if (resource.match(/ftp\.xml/)) {
        // process ftp xml file
    } else {
        // process uploaded image
        submitTask({
            name: "process-image",
            item,
            body: { resource },
        });
    }

    res.send({});
    return next();
}
