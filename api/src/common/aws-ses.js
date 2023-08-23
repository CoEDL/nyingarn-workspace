import {
    SESClient,
    ListTemplatesCommand,
    CreateTemplateCommand,
    DeleteTemplateCommand,
    SendTemplatedEmailCommand,
} from "@aws-sdk/client-ses";
import fsExtraPkg from "fs-extra";
const { readFile } = fsExtraPkg;
import path from "path";

export class SES {
    constructor({
        accessKeyId,
        secretAccessKey,
        region,
        endpoint,
        forcePathStyle = false,
        mode = undefined,
    }) {
        if (!mode) throw new Error(`The SES mode must be defined`);
        this.mode = mode;
        let configuration = {
            forcePathStyle,
        };

        if (endpoint) configuration.endpoint = endpoint;
        if (accessKeyId && secretAccessKey) {
            configuration.credentials = {
                accessKeyId,
                secretAccessKey,
            };
        }
        if (region) configuration.region = region;
        this.client = new SESClient(configuration);

        this.templates = [
            {
                TemplateName: `${mode}-application-login`,
                SubjectPart: `Login to the {{site}}`,
                TextPart: "Login to the {{site}} by clicking on this link: {{link}}",
                htmlFile: "application-login-email.html",
            },
        ];
        if (mode === "testing") {
            this.templates = this.templates.slice(0, 1);
        }
    }

    async listTemplates() {
        const params = {};
        const command = new ListTemplatesCommand(params);
        return await this.client.send(command);
    }

    async loadTemplates() {
        let templates = await this.listTemplates();
        templates = templates.TemplatesMetadata.map((t) => t.Name);
        for (let template of this.templates) {
            if (templates.includes(template.TemplateName)) continue;
            template.HtmlPart = (
                await readFile(
                    path.resolve(path.join("src/common/email-templates", template.htmlFile))
                )
            ).toString();

            const command = new CreateTemplateCommand({ Template: template });
            await this.client.send(command);
        }
    }

    async deleteAllTemplates() {
        let templates = await this.listTemplates();
        for (let template of templates.TemplatesMetadata) {
            if (template.Name.match(this.mode)) {
                const command = new DeleteTemplateCommand({ TemplateName: template.Name });
                try {
                    await this.client.send(command);
                } catch (error) {
                    console.log(error);
                }
            }
        }
    }

    async sendMessage({ templateName, data, to }) {
        if (this.mode === "testing") {
            return "email sent";
        }
        const input = {
            Source: "nyingarnproject@gmail.com", // required
            Destination: {
                ToAddresses: to,
            },
            ReplyToAddresses: ["nyingarn-project@unimelb.edu.au"],
            Template: templateName, // required
            TemplateData: JSON.stringify(data), // required
        };
        const command = new SendTemplatedEmailCommand(input);
        const response = await this.client.send(command);
        return response;
    }
}
