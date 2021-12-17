require("regenerator-runtime");
const restify = require("restify");
const server = restify.createServer();
const models = require("./src/models");
const { loadConfiguration, getLogger } = require("./src/common");
const { setupRoutes } = require("./src/routes");
const log = getLogger();
const rabbit = require("foo-foo-mq");

// DEVELOPER NOTE
//
//  Do not import fetch anywhere in your code. Use global.fetch
//   instead.
//
//  This way, jest fetch mock will override fetch when you need it to.
global.fetch = require("node-fetch");

(async () => {
    let configuration;
    try {
        configuration = await loadConfiguration();
    } catch (error) {
        log.error("configuration.json not found - stopping now");
        process.exit();
    }
    await models.sequelize.sync();
    global.rabbit = await initialiseRabbit({ configuration });

    if (process.env?.LOG_LEVEL === "debug") {
        server.use((req, res, next) => {
            log.debug(`${req.route.method}: ${req.route.path}`);
            return next();
        });
    }
    server.use(restify.plugins.dateParser());
    server.use(restify.plugins.queryParser());
    server.use(restify.plugins.jsonp());
    server.use(restify.plugins.gzipResponse());
    server.use(
        restify.plugins.bodyParser({
            maxBodySize: 0,
            mapParams: true,
            mapFiles: false,
            overrideParams: false,
            multiples: true,
            hash: "sha1",
            rejectUnknown: true,
            requestBodyOnGet: false,
            reviver: undefined,
            maxFieldsSize: 2 * 1024 * 1024,
        })
    );
    setupRoutes({ server });

    server.listen("8080", function () {
        log.info(`ready on ${server.url}`);
    });
})();

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
