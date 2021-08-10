import "regenerator-runtime";
import fetch from "node-fetch";

describe("Test loading the configuration", () => {
    test("it should be able to load the default configuration for the environment", async () => {
        let response = await fetch(`http://localhost:8080/configuration`);
        expect(response.status).toEqual(200);
        let configuration = await response.json();
        expect(configuration).toHaveProperty("services");
    });
});
