import { readJSON } from "fs-extra";

export async function loadConfiguration() {
    let configuration =
        process.env.NODE_ENV === "development"
            ? "/srv/configuration/development-configuration.json"
            : "/srv/configuration/configuration.json";
    configuration = await readJSON(configuration);
    return configuration;
}
