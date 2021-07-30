// these endpoints will only return data they are responsible for
//

import { demandKnownApplication } from "./middleware";

export function setupRoutes({ server }) {
    server.get("/", (req, res, next) => {
        res.send({});
        next();
    });
    // user mgt routes
    server.get(
        "/user",
        route((req, res, next) => {})
    );
    // server.get("/user/:userId", 'return data for userId', { properties = [] });
    // server.post('/user', 'create new user known to this application', { identifier, username, authenticationService })
    // server.del('/user/:userId', 'delete user known to this application', { identifier, authenticationService })
    // group mgt routes
    // server.get('/group', 'return group list', { page = 0, limit = 10})
    // server.get("/group/:groupId", 'return data for groupId', { properties = [] });
    // server.post('/group', 'create new group known to this application', { identifier })
    // server.del('/group/:groupId', 'delete group known to this application', { identifier })
    // role mgt routes
    // server.get('/role', 'return roles list', { page = 0, limit = 10})
    // server.get("/role/:roleId", 'return data for roleId', { properties = [] });
    // server.post('/role', 'create new role known to this application', { identifier })
    // server.del('/role/:roleId', 'delete role known to this application', { identifier })
    // user -> group mgt routes
    // server.get('/group/:groupId/user/:userId', 'is user in the group')
    // server.put('/group/:groupId/user/:userId', 'associate user to the group')
    // server.del('/group/:groupId/user/:userId', 'disassociate user from the group')
    // role -> group mgt routes
    // server.get('/group/:groupId/role/:roleId', 'does the group have the role')
    // server.put('/group/:groupId/role/:roleId', 'associate role to the group')
    // server.del('/group/:groupId/role/:roleId', 'disassociate user from the group')
    // role -> user mgt routes
    // server.get('/user/:userId/role/:roleId', 'does the user have the role')
    // server.put('/user/:userId/role/:roleId', 'associate role to the user')
    // server.del('/user/:userId/role/:roleId', 'disassociate user from the role')
}

function route(handler) {
    return [demandKnownApplication, handler];
}
