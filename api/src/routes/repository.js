import { demandAdministrator, demandAuthenticatedUser, getLogger } from "../common/index.js";
import { getRepositoryItems, indexRepositoryItem } from "../lib/repository.js";
const log = getLogger();

export function setupRoutes(fastify, options, done) {
    fastify.addHook("preHandler", demandAuthenticatedUser);

    fastify.register((fastify, options, done) => {
        fastify.addHook("preHandler", demandAdministrator);
        fastify.get("/repository/lookup-content", getRepositoryLookupContentHandler);
        fastify.get("/repository/index/:id", getRepositoryIndexContentHandler);
        done();
    });
    done();
}

async function getRepositoryLookupContentHandler(req) {
    let { prefix, offset } = req.query;
    let { items, total } = await getRepositoryItems({ user: req.session.user, prefix, offset });
    return { items, total };
}

async function getRepositoryIndexContentHandler(req) {
    let { id } = req.params;
    await indexRepositoryItem({ user: req.session.user, id });
    return {};
}
