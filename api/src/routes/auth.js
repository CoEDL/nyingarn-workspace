import { getLogger, logEvent } from "../common/logger.js";
import { findUserOrCreateAdministrator } from "../lib/user.js";
import { createSession } from "../lib/session.js";
import crypto from "crypto";
import models from "../models/index.js";
import { Mailer } from "../common/email.js";
import { add, isAfter, parseISO } from "date-fns";
const log = getLogger();

export function setupRoutes(fastify, options, done) {
    fastify.post("/auth/email-login/:origin", postEmailLoginRouteHandler);
    fastify.post("/auth/otp", postOtpRouteHandler);
    done();
}

// TODO this code does not have tests
export async function postEmailLoginRouteHandler(req, res) {
    let origin = req.session.configuration.api.origin[req.params.origin];
    if (!req.body.email) {
        return {};
    }

    const user = await findUserOrCreateAdministrator({
        email: req.body.email,
        configuration: req.session.configuration,
    });
    if (!user) {
        log.error(`User not found and not an administrator: ${req.body.email}. Denying login.`);
        return {};
    }
    const mailer = new Mailer(req.session.configuration.api.smtp);

    await models.otp.destroy({ where: { userId: user.id } });
    const otp = await user.createOtp({ password: crypto.randomBytes(30).toString("hex") });

    try {
        let response = await mailer.sendMessage({
            templateName: "application-login",
            data: {
                site:
                    req.params.origin === "workspace"
                        ? "Nyingarn Workspace"
                        : "Nyingarn Repository",
                link: `${origin}/otp/${otp.password}`,
            },
            to: [req.body.email],
        });
        if (response.rejected?.length) {
            log.error(`Login email to ${req.body.email} was rejected by the SMTP server`);
            return res.internalServerError();
        }
    } catch (error) {
        log.error(`Unable to send login email to ${req.body.email}: ${error.message}`);
        return res.internalServerError();
    }
    return {};
}

// TODO this code does not have tests
async function postOtpRouteHandler(req, res) {
    if (!req.body.otp) {
        return res.badRequest(`OTP not provided`);
    }

    let user = await models.user.findOne({
        include: [{ model: models.otp, where: { password: req.body.otp } }],
    });

    if (!user) {
        return {};
        // return res.unauthorized();
    }
    if (user.locked) {
        log.info(`The account for '${user.email}' is locked. Denying user login.`);
        return {};
        // return res.unauthorized();
    }
    if (
        isAfter(
            new Date(),
            add(user.otp.updatedAt, req.session.configuration.api.emailLoginTimeout)
        )
    ) {
        return res.unauthorized();
    }
    let session = await createSession({ user });
    await logEvent({
        level: "info",
        owner: user.email,
        text: `User '${user.email}' logged in via email OTP.`,
        data: { provider: "email" },
    });
    await models.otp.destroy({ where: { password: req.body.otp } });

    return { token: session.token };
}
