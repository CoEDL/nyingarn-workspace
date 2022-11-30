import { submitTask, getStoreHandle, log } from "../../common/index.js";

export async function authenticateTusRequest(req, res) {
    if (!req.session.user.upload) {
        return res.unauthorized();
    }
    return {};
}

export async function getItemPath(req, res) {
    if (!req.params.identifier) return;

    if (!req.session.user.upload) {
        return res.unauthorized();
    }
    let store = await getStoreHandle({ id: req.params.identifier, className: req.params.itemType });
    return { path: store.getItemPath() };
}

export async function triggerProcessing(req) {
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

    return {};
}
