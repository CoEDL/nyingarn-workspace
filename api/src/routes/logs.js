import { routeAdmin } from "../common";
import { getLogs } from "../lib/logs";

export function setupRoutes({ server }) {
    server.get("/admin/logs", routeAdmin(getLogsRouteHandler));
}

export async function getLogsRouteHandler(req, res, next) {
    let { limit, offset, level, dateFrom, dateTo } = req.query;
    let logs = await getLogs({ limit, offset, level, dateFrom, dateTo });
    logs.rows = logs.rows.map((r) => r.get());
    res.send({ logs });
    next();
}
