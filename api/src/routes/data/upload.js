import { log } from "./";
import { submitTask, getStoreHandle } from "../../common";

export async function authenticateTusRequest(req, res, next) {
    if (!req.session.user.upload) {
        return next(new UnauthorizedError());
    }
    res.send({});
    next();
}

export async function getItemPath(req, res, next) {
    if (!req.session.user.upload) {
        return next(new UnauthorizedError());
    }
    let store = await getStoreHandle({ id: req.params.identifier, className: req.params.itemType });
    res.send({ path: store.getItemPath() });
    next();
}

export async function triggerProcessing(req, res, next) {
    // await new Promise((resolve) => setTimeout(resolve, 15000));

    const identifier = req.params.identifier;
    const resource = req.params.resource;

    log.info(`Process: ${identifier}/${resource}`);
    let name;
    if (resource.match(/digivol\.csv/)) {
        // process digivol file
        name = "process-digivol";
    } else if (resource.match(/tei\.xml/)) {
        // process tei xml file
        name = "process-tei";
    } else {
        // process uploaded image
        name = "process-image";
    }
    await submitTask({
        name,
        item: req.item,
        body: { resource },
    });

    res.send({});
    return next();
}
