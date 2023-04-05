import("regenerator-runtime");

import models from "./src/models/index.js";
import { demandAuthenticatedUser, loadConfiguration, log } from "./src/common/index.js";
import { setupRoutes as setupBaseRoutes } from "./src/routes/base.js";
import { setupRoutes as setupAdminRoutes } from "./src/routes/admin.js";
import { setupRoutes as setupAuthRoutes } from "./src/routes/auth.js";
import { setupRoutes as setupCollectionRoutes } from "./src/routes/collection.js";
import { setupRoutes as setupDescriboRoutes } from "./src/routes/describo.js";
import { setupRoutes as setupItemRoutes } from "./src/routes/item.js";
import { setupRoutes as setupLogRoutes } from "./src/routes/logs.js";
import { setupRoutes as setupSearchRoutes } from "./src/routes/search.js";
import { setupRoutes as setupUserRoutes } from "./src/routes/user.js";
import { setupRoutes as setupDataRoutes } from "./src/routes/data/index.js";
import { setupRoutes as setupPublishRoutes } from "./src/routes/publish.js";
import rabbit from "foo-foo-mq";

import Fastify from "fastify";
import fastifyCompress from "@fastify/compress";
import cors from "@fastify/cors";
import fastifySensible from "@fastify/sensible";
import fastifyIO from "fastify-socket.io";
import fastifyTusS3Plugin from "@paradisec-platform/fastify-tus-s3-plugin";

const envToLogger = {
    development: {
        transport: {
            target: "@fastify/one-line-logger",
            // target: "pino-pretty",
            // options: { ignore: "reqId,req.hostname,req.remoteAddress,req.remotePort" },
        },
    },
    // development: true,
    production: true,
    test: false,
};
const fastify = Fastify({
    logger: envToLogger[process.env.NODE_ENV],
    bodyLimit: 256 * 1024 * 1024,
    keepAliveTimeout: 0,
});

main();
async function main() {
    let configuration;
    try {
        configuration = await loadConfiguration();
    } catch (error) {
        log.error("configuration.json not found - stopping now");
        process.exit();
    }

    await fastify.register(cors, {
        origin: "*",
        methods: ["OPTIONS", "GET", "HEAD", "PATCH", "POST", "DELETE"],
        allowedHeaders: [
            "content-type",
            "upload-length",
            "content-length",
            "upload-offset",
            "upload-expires",
            "location",
            "upload-metadata",
            "tus-resumable",
            "tus-version",
            "tus-max-size",
            "tus-extension",
        ],
        exposedHeaders: [
            "content-type",
            "upload-length",
            "content-length",
            "upload-offset",
            "upload-expires",
            "location",
            "upload-metadata",
            "tus-resumable",
            "tus-version",
            "tus-max-size",
            "tus-extension",
        ],
    });
    fastify.register(fastifySensible);
    fastify.register(fastifyIO);
    fastify.register(fastifyCompress);

    // register the TUS handler
    fastify.register((fastify, options, done) => {
        fastify.addHook("preHandler", demandAuthenticatedUser);

        fastify.register(fastifyTusS3Plugin, {
            awsAccessKeyId: configuration.api.services.s3.awsAccessKeyId,
            awsSecretAccessKey: configuration.api.services.s3.awsSecretAccessKey,
            region: configuration.api.services.s3.region,
            endpoint: configuration.api.services.s3.endpointUrl,
            forcePathStyle: configuration.api.services.s3.forcePathStyle,
            cachePath: "./.cache",
            uploadRoutePath: "/files",
            defaultUploadExpiration: { hours: 6 },
        });
        done();
    });

    fastify.addHook("onRequest", async (req, res) => {
        configuration = await loadConfiguration();
        req.io = fastify.io;
        req.session = {
            configuration,
        };
        global.testing = req.headers.testing;
    });
    fastify.addHook("onReady", async () => {
        const rabbit = await initialiseRabbit({ configuration });
        await models.sequelize.sync();
        fastify.decorate("models", models);
        fastify.decorate("rabbit", rabbit);
    });
    fastify.register(setupBaseRoutes);
    fastify.register(setupAdminRoutes);
    fastify.register(setupAuthRoutes);
    fastify.register(setupCollectionRoutes);
    fastify.register(setupDescriboRoutes);
    fastify.register(setupItemRoutes);
    fastify.register(setupLogRoutes);
    fastify.register(setupSearchRoutes);
    fastify.register(setupUserRoutes);
    fastify.register(setupDataRoutes);
    fastify.register(setupPublishRoutes);

    fastify.listen({ port: 8080, host: "0.0.0.0" }, function (err, address) {
        if (err) {
            fastify.log.error(err);
            process.exit(1);
        }
    });
}

async function initialiseRabbit({ configuration }) {
    await rabbit.configure({
        connection: {
            name: "default",
            user: configuration.api.services.rabbit.user,
            pass: configuration.api.services.rabbit.pass,
            host: configuration.api.services.rabbit.host,
            port: configuration.api.services.rabbit.port,
            vhost: "%2f",
            replyQueue: "customReplyQueue",
        },
        exchanges: configuration.api.services.rabbit.exchanges,
        queues: configuration.api.services.rabbit.queues,
        bindings: configuration.api.services.rabbit.bindings,
    });
    return rabbit;
}
