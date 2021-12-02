import { createLogger, format, transports } from "winston";
const { combine, timestamp, printf } = format;
import models from "../models";
const log = getLogger();

export function getLogger() {
    const myFormat = printf(({ level, message, timestamp }) => {
        return `${timestamp} ${level.toUpperCase()}: ${message}`;
    });
    const logger = createLogger({
        level: process.env?.LOG_LEVEL ? process.env.LOG_LEVEL : "debug",
        format: combine(timestamp(), myFormat),
        transports: [new transports.Console()],
    });
    return logger;
}

export async function logEvent({ level, owner, text, data }) {
    const levels = ["info", "warn", "error"];
    if (!level || !levels.includes(level)) {
        throw new Error(`'level' is required and must be one of '${levels}'`);
    }
    if (!text) {
        throw new Error(`'text' is required`);
    }
    try {
        await models.log.create({ level, owner, text, data });
    } catch (error) {
        log.error(`Couldn't update logs table: ${level}: ${text}`);
    }
}

export async function registerTask({ itemId, status, text, data }) {
    const statuses = ["in progress", "done", "failed"];
    if (!status || !statuses.includes(status)) {
        throw new Error(`'status' is required and must be one of '${statuses}'`);
    }
    if (!itemId) {
        throw new Error(`'itemId' is required`);
    }
    try {
        return (await models.task.create({ itemId, status, text, data })).get();
    } catch (error) {
        console.log(error);
        log.error(`Couldn't update tasks table: ${status}: ${text}`);
    }
}
