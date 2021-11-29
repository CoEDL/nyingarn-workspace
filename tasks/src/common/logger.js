import { createLogger, format, transports } from "winston";
const { combine, timestamp, printf } = format;
import models from "/srv/api/src/models";

export function getLogger() {
    const myFormat = printf(({ level, message, timestamp }) => {
        return `${timestamp} ${level.toUpperCase()}: ${message}`;
    });
    const logger = createLogger({
        level: process.env.NODE_ENV === "development" ? "debug" : "info",
        format: combine(timestamp(), myFormat),
        transports: [new transports.Console()],
    });
    return logger;
}

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
        await task.save();
    } catch (error) {
        console.log(error);
        log.error(`Couldn't update tasks table: ${taskId}: ${status}`);
    }
}

export async function deleteTask({ taskId }) {
    await models.task.destroy({ where: { id: taskId } });
}
