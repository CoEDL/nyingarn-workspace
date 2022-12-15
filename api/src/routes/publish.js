import {
    logEvent,
    demandAdministrator,
    demandAuthenticatedUser,
    requireCollectionAccess,
    requireItemAccess,
} from "../common/index.js";
import {
    getUser,
    getUsers,
    deleteUser,
    toggleUserCapability,
    createAllowedUserStubAccounts,
} from "../lib/user.js";
import { createSession } from "../lib/session.js";

export function setupRoutes(fastify, options, done) {
    fastify.addHook("preHandler", demandAuthenticatedUser);
    fastify.post(
        "/publish/collection/:identifier",
        { preHandler: requireCollectionAccess },
        postPublishCollectionHandler
    );
    fastify.post(
        "/publish/item/:identifier",
        { preHandler: requireItemAccess },
        postPublishItemHandler
    );
    done();
}

// TODO: this code does not have tests
async function postPublishCollectionHandler(req, res) {
    console.log(req.session);
    console.log(req.body);
}

// TODO: this code does not have tests
async function postPublishItemHandler(req, res) {
    console.log(req.session);
    console.log(req.body);
}
