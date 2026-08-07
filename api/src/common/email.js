import nodemailer from "nodemailer";
import fsExtraPkg from "fs-extra";
const { readFile } = fsExtraPkg;
import path from "path";
import mjml2html from "mjml";

const templatesPath = path.resolve("src/common/email-templates");

export const templates = {
    "application-login": {
        subject: "Login to the {{site}}",
        text: "Login to the {{site}} by clicking on this link: {{link}}",
        mjmlFile: "application-login-email.mjml",
    },
    "awaiting-review": {
        subject: "An item or collection is awaiting review",
        text: "An item or collection has just been published and is awaiting review",
        mjmlFile: "awaiting-review-email.mjml",
    },
};

export const compiledTemplates = {};

const htmlEntities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

function interpolate(content, data, { escape = false } = {}) {
    return content.replace(/{{\s*(\w+)\s*}}/g, (match, key) => {
        if (!(key in data)) return match;
        const value = String(data[key]);
        return escape ? value.replace(/[&<>"']/g, (c) => htmlEntities[c]) : value;
    });
}

export class Mailer {
    constructor({ source, replyTo, ...transport } = {}) {
        if (!source) throw new Error(`The email source address must be defined`);
        this.source = source;
        this.replyTo = Array.isArray(replyTo) ? replyTo.join(", ") : replyTo;

        // an auth block with a blank user means the relay doesn't require
        // authentication - passing it through makes nodemailer attempt AUTH anyway
        if (!transport.auth?.user) delete transport.auth;
        this.transport = nodemailer.createTransport(transport);
    }

    async compileTemplates() {
        for (let [name, template] of Object.entries(templates)) {
            const mjml = (await readFile(path.join(templatesPath, template.mjmlFile))).toString();
            const { html, errors } = mjml2html(mjml, { filePath: templatesPath });
            if (errors?.length) {
                throw new Error(
                    `Unable to compile the email template '${name}': ${errors
                        .map((error) => error.formattedMessage ?? error.message)
                        .join(", ")}`
                );
            }
            compiledTemplates[name] = html;
        }
    }

    async verifyConnection() {
        if (typeof this.transport.transporter?.verify !== "function") return true;
        return await this.transport.verify();
    }

    async sendMessage({ templateName, data = {}, to }) {
        const template = templates[templateName];
        if (!template) throw new Error(`Unknown email template: ${templateName}`);
        if (!compiledTemplates[templateName]) await this.compileTemplates();

        return await this.transport.sendMail({
            from: this.source,
            replyTo: this.replyTo,
            to,
            subject: interpolate(template.subject, data),
            text: interpolate(template.text, data),
            html: interpolate(compiledTemplates[templateName], data, { escape: true }),
        });
    }
}
