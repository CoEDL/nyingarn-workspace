import { InternalServerError } from "restify-errors";
import { routeAdmin, route } from "../common";
import {
    getUsers,
    deleteUser,
    toggleUserCapability,
    createAllowedUserStubAccounts,
} from "../lib/user";
import { createSession } from "../lib/session";

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
    } catch (error) {
        return next(new InternalServerError(error.message));
    }
    res.send({});
    next();
}

async function deleteUserRouteHandler(req, res, next) {
    try {
        await deleteUser({ userId: req.params.userId });
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
    } catch (error) {
        return next(new InternalServerError(error.message));
    }

    let session = await createSession({ user });
    res.send({ token: session.token });
    next();
}
