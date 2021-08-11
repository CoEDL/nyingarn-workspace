import { BadRequestError } from "restify-errors";
import { loadConfiguration } from "../common";
import { URLSearchParams } from "url";
import { jwtVerify } from "jose/jwt/verify";
import { createRemoteJWKSet } from "jose/jwks/remote";

export function setupRoutes({ server }) {
    // user mgt routes
    server.post("/auth/google/code", getGoogleOauthToken);
    // server.get("/user/:userId", 'return data for userId', { properties = [] });
    // server.post('/user', 'create new user known to this application', { identifier, username, authenticationService })
    // server.del('/user/:userId', 'delete user known to this application', { identifier, authenticationService })
}

async function getGoogleOauthToken(req, res, next) {
    // https://developers.google.com/identity/protocols/oauth2/openid-connect#exchangecode
    if (!req.body.code) {
        return next(new BadRequestError(`Code not provided`));
    }

    let configuration = await loadConfiguration();
    let token = await getOauthToken({ code: req.body.code, configuration });
    let userData = await extractUserDataFromIdToken({ configuration, provider: "google", token });
    console.log(userData);

    res.send({});
    next();
}

export async function getOauthToken({ code, configuration }) {
    configuration = configuration.api.services.google;
    let body = {
        code,
        client_id: configuration.clientId,
        client_secret: configuration.clientSecret,
        redirect_uri: configuration.redirectUri,
        grant_type: "authorization_code",
    };
    let url = `${configuration.tokenEndpoint}?` + new URLSearchParams(body);
    let response = await global.fetch(url, { method: "POST" });
    if (response.status !== 200) {
        console.log("here");
        //  log an error
    }
    let token = await response.json();
    return token;
}

export async function extractUserDataFromIdToken({ configuration, provider, token }) {
    configuration = configuration.api.services[provider];
    const JWKS = createRemoteJWKSet(new URL(configuration.jwks));
    let tokenData = await jwtVerify(token.id_token, JWKS, {
        audience: configuration.clientId,
    });
    let { email, given_name, family_name, exp } = tokenData.payload;
    return { provider, email, given_name, family_name, expiresAt: new Date(exp * 1000) };
}
