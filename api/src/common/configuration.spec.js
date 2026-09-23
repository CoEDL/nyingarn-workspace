import "regenerator-runtime";
import { loadConfiguration } from "./configuration";

describe("Test loading the configuration", () => {
    test("it should be able to load the default configuration for the environment", async () => {
        let configuration = await loadConfiguration();
        expect(configuration).toHaveProperty("api");
        expect(configuration).toHaveProperty("ui");
    });
});
