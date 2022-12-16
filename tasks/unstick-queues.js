import rabbit from "foo-foo-mq";
import fsExtraPkg from "fs-extra";
const { readJSON } = fsExtraPkg;
const configuration = await readJSON("/srv/configuration/configuration.json");

rabbit.handle("process-image", ack);
rabbit.handle("process-digivol", ack);
rabbit.handle("process-tei", ack);
rabbit.handle("extract-table", ack);

main();
async function main() {
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

async function ack(msg) {
    msg.ack();
}
