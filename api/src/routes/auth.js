import { BadRequestError } from "restify-errors";

export function setupRoutes({ server }) {
    // user mgt routes
    server.post("/auth/google/code", route(getGoogleOauthToken));
    // server.get("/user/:userId", 'return data for userId', { properties = [] });
    // server.post('/user', 'create new user known to this application', { identifier, username, authenticationService })
    // server.del('/user/:userId', 'delete user known to this application', { identifier, authenticationService })
}

function getGoogleOauthToken(req, res, next) {
    // https://developers.google.com/identity/protocols/oauth2/openid-connect#exchangecode
    if (req.body.code) {
        return next(new BadRequestError(`Code not provided`));
    }
    res.send({});
    next();
}
