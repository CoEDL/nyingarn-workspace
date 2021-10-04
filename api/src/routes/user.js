import { routeAdmin } from "../common";
import { getUsers } from "../lib/user";

export function setupRoutes({ server }) {
    // user mgt routes
    server.get("/admin/users", routeAdmin(getUserRouteHandler));
    // server.get("/user/:userId", 'return data for userId', { properties = [] });
    // server.post('/user', 'create new user known to this application', { identifier, username, authenticationService })
    // server.del('/user/:userId', 'delete user known to this application', { identifier, authenticationService })
}

async function getUserRouteHandler(req, res, next) {
    let users = await getUsers({
        offset: req.query.offset,
        limit: req.query.limit,
    });
    res.send(users);
}
