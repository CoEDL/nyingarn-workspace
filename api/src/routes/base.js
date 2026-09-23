import models from "../models/index.js";
import { demandAuthenticatedUser } from "../common/middleware.js";

export function setupRoutes(fastify, options, done) {
    fastify.get("/", () => ({}));
    fastify.get("/configuration", async (req) => {
        const configuration = req.session.configuration;
        return {
            ui: configuration.ui,
            processing: configuration.api.processing,
        };
    });
    fastify.get(
        "/authenticated",
        {
            preHandler: demandAuthenticatedUser,
        },
        async () => ({})
    );
    fastify.get("/logout", async (req, res) => {
        let token = req.headers.authorization.split("Bearer ")[1];
        if (token) {
            let session = await models.session.findOne({ where: { token } });
            if (session) await session.destroy();
        }
        return res.unauthorized();
    });
    done();
}
