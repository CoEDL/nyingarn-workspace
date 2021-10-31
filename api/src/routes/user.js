import { InternalServerError } from "restify-errors";
import { routeAdmin, route, logEvent, getLogger } from "../common";
import {
    getUsers,
    deleteUser,
    toggleUserCapability,
    createAllowedUserStubAccounts,
} from "../lib/user";
import { createSession } from "../lib/session";
const log = getLogger();

export function setupRoutes({ server }) {
    // user routes
    server.put("/users/:userId/upload", route(putUsersUploadCapabilityRouteHandler));

    // admin user routes
    server.get("/admin/users", routeAdmin(getUsersRouteHandler));
    server.post("/admin/users", routeAdmin(postInviteUsersRouteHandler));
    server.put("/admin/users/:userId/:capability", routeAdmin(putUserToggleCapabilityRouteHandler));
    server.del("/admin/users/:userId", routeAdmin(deleteUserRouteHandler));
    // server.get("/user/:userId", 'return data for userId', { properties = [] });
    // server.post('/user', 'create new user known to this application', { identifier, username, authenticationService })
    // server.del('/user/:userId', 'delete user known to this application', { identifier, authenticationService })
}

async function getUsersRouteHandler(req, res, next) {
    let users = await getUsers({
        offset: req.query.offset,
        limit: req.query.limit,
    });
    res.send(users);
    next();
}

async function postInviteUsersRouteHandler(req, res, next) {
    try {
        await createAllowedUserStubAccounts({ emails: req.body.emails });
        logEvent({
            level: "info",
            owner: req.session.user.email,
            text: `Admin invited users to the workspace.`,
            data: { emails: req.body.emails },
        });
    } catch (error) {
        return next(new InternalServerError(error.message));
    }
    res.send({});
    next();
}

async function putUserToggleCapabilityRouteHandler(req, res, next) {
    try {
        await toggleUserCapability({
            userId: req.params.userId,
            capability: req.params.capability,
        });
        logEvent({
            level: "info",
            owner: req.session.user.email,
            text: `Admin toggled capability '${req.params.capability}' for user '${req.params.userId}'.`,
        });
    } catch (error) {
        return next(new InternalServerError(error.message));
    }
    res.send({});
    next();
}

async function deleteUserRouteHandler(req, res, next) {
    try {
        await deleteUser({ userId: req.params.userId });
        logEvent({
            level: "info",
            owner: req.session.user.email,
            text: `Admin deleted user '${req.params.userId}'.`,
        });
    } catch (error) {
        return next(new InternalServerError(error.message));
    }
    res.send({});
    next();
}

async function putUsersUploadCapabilityRouteHandler(req, res, next) {
    let userId = req.session.user.id;
    let user;
    try {
        user = await toggleUserCapability({
            userId,
            capability: "upload",
        });
        logEvent({
            level: "info",
            owner: req.session.user.email,
            text: `User accepted terms and conditions of use. Enabling upload capability.`,
        });
    } catch (error) {
        return next(new InternalServerError(error.message));
    }

    let session = await createSession({ user });
    res.send({ token: session.token });
    next();
}
