import {
    SESClient,
    ListTemplatesCommand,
    CreateTemplateCommand,
    DeleteTemplateCommand,
    SendTemplatedEmailCommand,
} from "@aws-sdk/client-ses";
import lodashPkg from "lodash";
const { groupBy } = lodashPkg;
import fsExtraPkg from "fs-extra";
const { readFile, writeFile, stat: fileStat } = fsExtraPkg;
import path from "path";
import mjml2html from "mjml";

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
            {
                TemplateName: `${mode}-awaiting-review`,
                SubjectPart: `An item or collection is awaiting review`,
                TextPart: "An item or collection has just been published and is awaiting review",
                htmlFile: "awaiting-review-email.html",
            },
        ];
        if (mode === "testing") {
            this.templates = this.templates.slice(0, 1);
        }
    }

    async compileTemplates() {
        for (let template of this.templates) {
            const htmlFile = path.resolve(
                path.join("src/common/email-templates", template.htmlFile)
            );
            template = (await readFile(htmlFile.replace(".html", ".mjml"))).toString();
            const htmlOutput = mjml2html(template);
            await writeFile(htmlFile, htmlOutput.html);
        }
    }

    async listTemplates() {
        const params = {};
        const command = new ListTemplatesCommand(params);
        return await this.client.send(command);
    }

    async loadTemplates() {
        const sesTemplates = (await this.listTemplates()).TemplatesMetadata;
        // templates = templates.TemplatesMetadata.map((t) => t.Name);
        for (let template of this.templates) {
            // if (templates.includes(template.TemplateName)) continue;

            const htmlFile = path.resolve(
                path.join("src/common/email-templates", template.htmlFile)
            );
            template.HtmlPart = (await readFile(htmlFile)).toString();
            const stat = await fileStat(htmlFile.replace(".html", ".mjml"));

            let exists = sesTemplates.filter((t) => t.Name === template?.TemplateName);
            if (exists.length) {
                const sesTemplate = exists[0];
                if (stat.ctime > sesTemplate.CreatedTimestamp) {
                    // local template is newer than ses template
                    //   delete ses template
                    console.log(`Installing new SES template: ${template.TemplateName}`);
                    let command = new DeleteTemplateCommand({
                        TemplateName: template.TemplateName,
                    });
                    try {
                        await this.client.send(command);
                    } catch (error) {
                        console.log(error);
                    }

                    // load new template
                    command = new CreateTemplateCommand({ Template: template });
                    await this.client.send(command);
                }
            }
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

    async sendMessage({ templateName, data = {}, to }) {
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
