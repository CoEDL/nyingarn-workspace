let configuration = {
    applications: [
        {
            name: "nyingarn workspace",
            origin: "https://workspace.nyingarn.net",
            secret: "the-shared-secret-sent-in-the-headers",
        },
        {
            name: "nabu",
            origin: "https://workspace.catalog.paradisec.org.au",
            secret: "a-different-shared-secret-sent-in-the-headers",
        },
    ],
};


// these endpoints will only return data they are responsible for
//   
// user mgt routes
route.get("/user", 'return user list', { page = 0, limit = 10 });
route.get("/user/:userId", 'return data for userId', { properties = [] });
route.post('/user', 'create new user known to this application', { identifier, username, authenticationService })
route.del('/user/:userId', 'delete user known to this application', { identifier, authenticationService })

// group mgt routes
route.get('/group', 'return group list', { page = 0, limit = 10})
route.get("/group/:groupId", 'return data for groupId', { properties = [] });
route.post('/group', 'create new group known to this application', { identifier })
route.del('/group/:groupId', 'delete group known to this application', { identifier })

// role mgt routes
route.get('/role', 'return roles list', { page = 0, limit = 10})
route.get("/role/:roleId", 'return data for roleId', { properties = [] });
route.post('/role', 'create new role known to this application', { identifier })
route.del('/role/:roleId', 'delete role known to this application', { identifier })

// user -> group mgt routes
route.get('/group/:groupId/user/:userId', 'is user in the group')
route.put('/group/:groupId/user/:userId', 'associate user to the group')
route.del('/group/:groupId/user/:userId', 'disassociate user from the group')

// role -> group mgt routes
route.get('/group/:groupId/role/:roleId', 'does the group have the role')
route.put('/group/:groupId/role/:roleId', 'associate role to the group')
route.del('/group/:groupId/role/:roleId', 'disassociate user from the group')

// role -> user mgt routes
route.get('/user/:userId/role/:roleId', 'does the user have the role')
route.put('/user/:userId/role/:roleId', 'associate role to the user')
route.del('/user/:userId/role/:roleId', 'disassociate user from the role')

// database model associations
//  group can have many users
//  group can have many roles
//  user can be in many groups
//  user can have many roles

// all database models tied to application 
//  applications created at boot up from configuration
//  application secret updated at boot if 'name and origin' unchanged
// 
