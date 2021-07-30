import { route } from "../middleware";
import { getUser } from "../lib/user";

export function setupRoutes({ server }) {
    // user mgt routes
    server.get("/user", route(getUserRouteHandler));
    // server.get("/user/:userId", 'return data for userId', { properties = [] });
    // server.post('/user', 'create new user known to this application', { identifier, username, authenticationService })
    // server.del('/user/:userId', 'delete user known to this application', { identifier, authenticationService })
}

/**
 * @name Get Application Users
 * @route {GET} /user
 * @headerparam {string} authorization the shared secret for the calling application
 * @queryparam {number} page where to return results from
 * @queryparam {number} limit the number of results to return
 */

async function getUserRouteHandler(req, res, next) {}
