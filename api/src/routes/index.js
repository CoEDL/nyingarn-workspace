// these endpoints will only return data they are responsible for
//
import models from "../models";
import { UnauthorizedError, ForbiddenError } from "restify-errors";
import { setupRoutes as setupUserRoutes } from "./user";
import { setupRoutes as setupAuthRoutes } from "./auth";
import { setupRoutes as setupItemRoutes } from "./item";
import { setupRoutes as setupDescriboRoutes } from "./describo";
import { setupRoutes as setupDataRoutes } from "./data";
import { setupRoutes as setupLogRoutes } from "./logs";
import { loadConfiguration, filterPrivateInformation, route, routeAdmin } from "../common";
import { readJSON } from "fs-extra";

export function setupRoutes({ server }) {
    if (process.env.NODE_ENV === "development") {
        server.get(
            "/test-middleware",
            route((req, res, next) => {
                res.send({});
                next();
            })
        );
    }
    server.get("/", (req, res, next) => {
        res.send({});
        next();
    });
    server.get("/configuration", async (req, res, next) => {
        let configuration = await loadConfiguration();
        configuration = filterPrivateInformation({ configuration });
        res.send({
            ui: configuration.ui,
            processing: configuration.api.processing,
            teiMarkupControls: await readJSON(configuration.api.teiMarkupControls),
            authentication: Object.keys(configuration.api.authentication),
        });
        next();
    });
    server.get(
        "/authenticated",
        route(async (req, res, next) => {
            res.send({});
            next();
        })
    );
    server.get(
        "/admin",
        routeAdmin(async (req, res, next) => {
            res.send({});
            next();
        })
    );
    server.get("/logout", async (req, res, next) => {
        let token = req.headers.authorization.split("Bearer ")[1];
        if (token) {
            let session = await models.session.findOne({ where: { token } });
            if (session) await session.destroy();
        }
        next(new UnauthorizedError());
    });
    // server.post("/recaptcha", async (req, res, next) => {
    //     let configuration = await loadConfiguration();
    //     const body = {
    //         secret: configuration.api.services.recaptcha.secretKey,
    //         response: req.body.token,
    //     };
    //     let response = await global.fetch(
    //         `https://www.google.com/recaptcha/api/siteverify?secret=${body.secret}&response=${body.response}`,
    //         {
    //             method: "POST",
    //             headers: {
    //                 "Content-Type": "application/json",
    //             },
    //             body: JSON.stringify(body),
    //         }
    //     );
    //     let success = (await response.json()).success;
    //     if (!success) {
    //         return next(new ForbiddenError());
    //     }
    //     res.send({});
    //     next();
    // });
    setupUserRoutes({ server });
    setupAuthRoutes({ server });
    setupItemRoutes({ server });
    setupDataRoutes({ server });
    setupDescriboRoutes({ server });
    setupLogRoutes({ server });
}
