// import { describe, beforeAll, beforeEach, afterAll, it, expect } from "vitest";
import { SES } from "./aws-ses.js";
import { loadConfiguration } from "./configuration.js";

describe("AWS SES tests", () => {
    let ses;
    beforeAll(async () => {
        const configuration = await loadConfiguration();
        let aws = configuration.api.services.aws;
        let params = {
            accessKeyId: aws.awsAccessKeyId,
            secretAccessKey: aws.awsSecretAccessKey,
            region: aws.region,
            mode: "testing",
            source: configuration.api.ses.source,
            replyTo: configuration.api.ses.replyTo,
        };
        ses = new SES(params);
    });
    beforeEach(async () => {
        await ses.deleteAllTemplates();
        await new Promise((resolve) => setTimeout(resolve, 1000));
    });
    afterAll(async () => {
        await ses.deleteAllTemplates();
    });
    it(`should be able to create and list templates`, async () => {
        let templates = await ses.listTemplates();
        templates.TemplatesMetadata = templates.TemplatesMetadata.filter(
            (t) => !t.Name.match(/production-/)
        );
        expect(templates.TemplatesMetadata).toEqual([]);
        await ses.loadTemplates();
        templates = await ses.listTemplates();
        templates.TemplatesMetadata = templates.TemplatesMetadata.filter(
            (t) => !t.Name.match(/production-/)
        );
        expect(templates.TemplatesMetadata).toMatchObject([{ Name: "testing-application-login" }]);
    });
    it("should be able to send a templated email", async () => {
        await ses.loadTemplates();
        let response = await ses.sendMessage({
            templateName: `testing-application-login`,
            data: { site: "Nyingarn Repository", link: "https://workspace.nyingarn.net/otp/xxYY" },
            to: ["m@lr.id.au"],
        });
        expect(response).toEqual("email sent");
    });
});
