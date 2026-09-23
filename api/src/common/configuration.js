import fsExtraPkg from "fs-extra";
const { readJSON } = fsExtraPkg;

export async function loadConfiguration() {
    let configuration =
        process.env.NODE_ENV === "development"
            ? "/srv/configuration/development-configuration.json"
            : "/srv/configuration/configuration.json";
    configuration = await readJSON(configuration);
    return configuration;
}

export async function loadProfile({ profile }) {
    return await readJSON(`/srv/profiles/${profile}`);
}
