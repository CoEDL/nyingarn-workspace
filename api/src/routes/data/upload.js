import { submitTask, getStoreHandle, log } from "../../common/index.js";

export async function authenticateTusRequest(req, res) {
    if (!req.session.user.upload) {
        return res.unauthorized();
    }
    return {};
}

export async function getUploadDetails(req, res) {
    if (!req.params.identifier) return;

    if (!req.session.user.upload) {
        return res.unauthorized();
    }
    let store = await getStoreHandle({ id: req.params.identifier, type: req.params.itemType });
    return {
        path: store.getObjectPath(),
        bucket: req.session.configuration.api.services.s3.bucket,
    };
}

export async function triggerProcessing(req) {
    // await new Promise((resolve) => setTimeout(resolve, 15000));
    const { identifier, resource } = req.params;
    const { action, overwrite } = req.body;

    log.info(`Process: ${identifier}/${resource}`);
    let name;
    if (resource === `${identifier}-digivol.csv`) {
        // process digivol file
        name = "process-digivol";
    } else if (resource === `${identifier}-tei.xml`) {
        // process tei xml file
        name = "process-tei";
    } else {
        // process uploaded image
        name = action ? action : "process-image";
    }

    let task = {
        rabbit: this.rabbit,
        configuration: req.session.configuration,
        item: req.session.item.get(),
        name,
        body: { resource, overwrite },
    };
    task = await submitTask(task);

    return { taskId: task.id };
}
