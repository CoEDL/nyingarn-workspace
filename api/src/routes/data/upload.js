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
    let store = await getStoreHandle({ id: req.params.identifier, type: req.params.itemType });
    return { path: store.getObjectPath() };
}

export async function triggerProcessing(req) {
    // await new Promise((resolve) => setTimeout(resolve, 15000));
    const { identifier, resource } = req.params;

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
    const task = {
        rabbit: this.rabbit,
        configuration: req.session.configuration,
        item: req.session.item.get(),
        name,
        body: { resource },
    };
    await submitTask(task);

    return {};
}
