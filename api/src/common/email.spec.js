import { Mailer, templates, compiledTemplates } from "./email.js";
import { loadConfiguration } from "./configuration.js";

describe("Email tests", () => {
    let mailer;
    beforeAll(async () => {
        const configuration = await loadConfiguration();
        mailer = new Mailer({
            source: configuration.api.smtp.source,
            replyTo: configuration.api.smtp.replyTo,
            jsonTransport: true,
        });
    });
    it("should fail without a source address", () => {
        expect(() => new Mailer({ jsonTransport: true })).toThrow();
    });
    it("should be able to compile all of the templates", async () => {
        await mailer.compileTemplates();
        for (let name of Object.keys(templates)) {
            expect(compiledTemplates[name]).toMatch(/<html/);
        }
    });
    it("should fail on an unknown template", async () => {
        await expect(
            mailer.sendMessage({ templateName: "not-a-template", to: ["m@lr.id.au"] })
        ).rejects.toThrow();
    });
    it("should be able to send a templated email", async () => {
        let response = await mailer.sendMessage({
            templateName: "application-login",
            data: { site: "Nyingarn Repository", link: "https://workspace.nyingarn.net/otp/xxYY" },
            to: ["m@lr.id.au"],
        });
        expect(response.envelope.to).toEqual(["m@lr.id.au"]);

        const message = JSON.parse(response.message);
        expect(message.subject).toEqual("Login to the Nyingarn Repository");
        expect(message.text).toMatch("https://workspace.nyingarn.net/otp/xxYY");
        expect(message.html).toMatch('href="https://workspace.nyingarn.net/otp/xxYY"');
        expect(message.html).not.toMatch(/{{\w+}}/);
    });
    it("should escape template data interpolated into the html", async () => {
        let response = await mailer.sendMessage({
            templateName: "application-login",
            data: { site: `<script>alert("x")</script>`, link: "https://nyingarn.net/otp/xxYY" },
            to: ["m@lr.id.au"],
        });
        const message = JSON.parse(response.message);
        expect(message.html).not.toMatch("<script>");
        expect(message.html).toMatch("&lt;script&gt;");
    });
});
