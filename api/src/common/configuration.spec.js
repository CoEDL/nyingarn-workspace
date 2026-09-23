import "regenerator-runtime";
import { loadConfiguration } from "./configuration";

describe("Test loading the configuration", () => {
    const originalEnv = { ...process.env };
    afterEach(() => {
        process.env = { ...originalEnv };
    });

    test("it should be able to load the default configuration for the environment", async () => {
        let configuration = await loadConfiguration();
        expect(configuration).toHaveProperty("api");
        expect(configuration).toHaveProperty("ui");
    });
    test("it should fill secrets in from the environment", async () => {
        process.env.SESSION_SECRET = "a-session-secret-from-the-environment";
        let configuration = await loadConfiguration();
        expect(configuration.api.session.secret).toEqual("a-session-secret-from-the-environment");
    });
    test("it should name every missing required secret", async () => {
        delete process.env.SESSION_SECRET;
        process.env.RABBIT_PASS = "";
        await expect(loadConfiguration()).rejects.toThrow(
            "Missing required environment variables: SESSION_SECRET, RABBIT_PASS"
        );
    });
    test("it should only require the Textract keys in production", async () => {
        delete process.env.AWS_ACCESS_KEY_ID;
        delete process.env.AWS_SECRET_ACCESS_KEY;
        await expect(loadConfiguration()).resolves.toHaveProperty("api");
    });
    test("it should reject an unknown environment", async () => {
        process.env.NYINGARN_ENV = "development";
        await expect(loadConfiguration()).rejects.toThrow("NYINGARN_ENV must be one of dev, test, prod");
    });
});
