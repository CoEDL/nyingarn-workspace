import { loadConfiguration } from ".";
import models from "../models";

export async function registerTask({ itemId, status, name, data }) {
    const statuses = ["in progress", "done", "failed"];
    if (!status || !statuses.includes(status)) {
        throw new Error(`'status' is required and must be one of '${statuses}'`);
    }
    if (!itemId) {
        throw new Error(`'itemId' is required`);
    }
    try {
        return (await models.task.create({ itemId, status, name, data })).get();
    } catch (error) {
        console.log(error);
        log.error(`Couldn't update tasks table: ${status}: ${text}`);
    }
}

export async function submitTask({ item, name, body }) {
    let configuration = await loadConfiguration();
    let task = await registerTask({
        itemId: item.id,
        status: "in progress",
        name,
        data: { resource: body.resource },
    });
    global.rabbit.publish(configuration.api.processing.exchange, {
        type: name,
        body: { ...body, identifier: item.identifier, task },
    });
}
