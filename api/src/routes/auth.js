import { BadRequestError } from "restify-errors";
import { loadConfiguration } from "../common";
import { jwtVerify } from "jose/jwt/verify";
import { createRemoteJWKSet } from "jose/jwks/remote";
import { Issuer, generators } from "openid-client";
import { createUser } from "../lib/user";
import { createSession } from "../lib/session";

export function setupRoutes({ server }) {
    // user mgt routes
    server.get("/auth/:provider/login", getLoginUrlRouteHandler);
    server.post("/auth/:provider/code", getOauthTokenRouteHandler);
    // server.get("/user/:userId", 'return data for userId', { properties = [] });
    // server.post('/user', 'create new user known to this application', { identifier, username, authenticationService })
    // server.del('/user/:userId', 'delete user known to this application', { identifier, authenticationService })
}

async function getLoginUrlRouteHandler(req, res, next) {
    const provider = req.params.provider;

    let configuration = await loadConfiguration();
    configuration = configuration.api.services[provider];
    let issuer = await Issuer.discover(configuration.discover);
    const client = new issuer.Client({
        client_id: configuration.clientId,
        client_secret: configuration.clientSecret,
        redirect_uris: [configuration.redirectUri],
        response_types: ["code"],
    });
    const code_verifier = generators.codeVerifier();
    const code_challenge = generators.codeChallenge(code_verifier);
    const code_challenge_method = "S256";
    const url = client.authorizationUrl({
        scope: "openid email profile",
        code_challenge,
        code_challenge_method,
        state: provider,
    });
    res.send({ url, code_verifier });
    next();
}

async function getOauthTokenRouteHandler(req, res, next) {
    const provider = req.params.provider;
    if (!req.body.code) {
        return next(new BadRequestError(`Code not provided`));
    }

    let configuration = await loadConfiguration();
    let { token, jwks } = await getOauthToken({
        provider,
        code: req.body.code,
        code_verifier: req.body.code_verifier,
        configuration,
    });
    let userData = await extractUserDataFromIdToken({ configuration, provider, jwks, token });

    let user = await createUser(userData);
    let session = await createSession({ user });

    res.send({ token: session.token });
    next();
}

async function getOauthToken({ provider, code, code_verifier, configuration }) {
    configuration = configuration.api.services[provider];
    let issuer = await Issuer.discover(configuration.discover);
    const client = new issuer.Client({
        client_id: configuration.clientId,
        client_secret: configuration.clientSecret,
        redirect_uris: [configuration.redirectUri],
        response_types: ["code"],
    });
    let token = await client.callback(configuration.redirectUri, { code }, { code_verifier });
    return { token, jwks: issuer.jwks_uri };
}

export async function extractUserDataFromIdToken({ configuration, provider, jwks, token }) {
    configuration = configuration.api.services[provider];
    const JWKS = createRemoteJWKSet(new URL(jwks));
    let tokenData = await jwtVerify(token.id_token, JWKS, {
        audience: configuration.clientId,
    });
    let { email, given_name, family_name } = tokenData.payload;
    return { provider, email, givenName: given_name, familyName: family_name };
}
