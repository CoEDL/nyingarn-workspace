import { route } from "../middleware";
import { getUsers } from "../lib/user";

export function setupRoutes({ server }) {
    // user mgt routes
    server.get("/user", route(getUserRouteHandler));
    // server.get("/user/:userId", 'return data for userId', { properties = [] });
    // server.post('/user', 'create new user known to this application', { identifier, username, authenticationService })
    // server.del('/user/:userId', 'delete user known to this application', { identifier, authenticationService })
}

/**
 * Get the users associated to this application
 *
 * @name Get Application Users
 * @route {GET} /user
 * @headerparam {string} authorization the shared secret for the calling application
 * @queryparam {number} page where to return results from, e.g. page=0
 * @queryparam {number} limit the number of results to return, e.g. limit=10
 */

async function getUserRouteHandler(req, res, next) {
    let users = await getUsers({
        applicationId: req.session.application.id,
        page: req.query.page,
        limit: req.query.limit,
    });
    res.send(users);
    next(0);
}
