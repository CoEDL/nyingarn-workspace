import { SignJWT } from "jose/jwt/sign";
import { jwtVerify } from "jose/jwt/verify";
import { createSecretKey } from "crypto";
import add from "date-fns/add";
import isAfter from "date-fns/isAfter";
import parseISO from "date-fns/parseISO";

export async function generateToken({ configuration, user }) {
    const key = createSecretKey(Buffer.from(configuration.api.session.secret, "utf-8"));
    const expires = add(new Date(), configuration.api.session.lifetime);
    const token = await new SignJWT({
        id: user.id,
        email: user.email,
        givenName: user.givenName,
        familyName: user.familyName,
        administrator: user.administrator,
        expires,
    })
        .setProtectedHeader({ alg: "HS256" })
        .sign(key);

    return { token, expires };
}

export async function verifyToken({ token, configuration }) {
    const key = createSecretKey(Buffer.from(configuration.api.session.secret, "utf-8"));
    let { payload } = await jwtVerify(token, key, {});

    if (isAfter(new Date(), parseISO(payload.expires))) {
        // token expired
        throw new Error(`token expired`);
    }
    return payload;
}
