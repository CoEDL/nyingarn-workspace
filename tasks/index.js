const rabbit = require("foo-foo-mq");
const { loadConfiguration } = require("./src/common");
const { setupHandlers } = require("./src/routing");
const models = require("/srv/api/src/models");
setupHandlers({ rabbit });

main();
async function main() {
    let configuration = await loadConfiguration();
    await models.sequelize.sync();
    rabbit
        .configure({
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
        })
        .then(() => {
            console.log("rabbit connected!");
        });
}
