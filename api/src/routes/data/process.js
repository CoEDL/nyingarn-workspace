import { processThumbnails, processOcr, processWebFormats } from "../../lib/data";

export async function processThumbnailsRouteHandler(req, res, next) {
    await processThumbnails({ userId: req.session.user.id, identifier: req.body.identifier });
    res.send({});
    next();
}

export async function processOcrRouteHandler(req, res, next) {
    await processOcr({ userId: req.session.user.id, identifier: req.body.identifier });
    res.send({});
    next();
}

export async function processWebFormatsRouteHandler(req, res, next) {
    await processWebFormats({ userId: req.session.user.id, identifier: req.body.identifier });
    res.send({});
    next();
}
