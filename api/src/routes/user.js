import { InternalServerError } from "restify-errors";
import { routeAdmin } from "../common";
import {
    getUsers,
    deleteUser,
    toggleUserCapability,
    createAllowedUserStubAccounts,
} from "../lib/user";

export function setupRoutes({ server }) {
    // user mgt routes
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
