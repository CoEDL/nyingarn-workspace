import models from "/srv/api/src/models/index.js";

export async function updateTask({ taskId, status, text, data }) {
    const statuses = ["in progress", "done", "failed"];
    if (!status || !statuses.includes(status)) {
        throw new Error(`'status' is required and must be one of '${statuses}'`);
    }
    if (!taskId) {
        throw new Error(`'taskId' is required`);
    }
    try {
        let task = await models.task.findOne({ where: { id: taskId } });
        task.status = status;
        task.data = data;
        await task.save();
    } catch (error) {
        console.log(error);
        log.error(`Couldn't update tasks table: ${taskId}: ${status}`);
    }
}

export async function deleteTask({ taskId }) {
    await models.task.destroy({ where: { id: taskId } });
}
