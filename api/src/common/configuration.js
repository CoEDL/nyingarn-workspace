import fsExtraPkg from "fs-extra";
const { readJSON } = fsExtraPkg;

const environments = ["dev", "test", "prod"];

// [env var, config path, environments where it must be set]
const secrets = [
    ["SESSION_SECRET", "api.session.secret", environments],
    ["S3_ACCESS_KEY_ID", "api.services.s3.awsAccessKeyId", environments],
    ["S3_SECRET_ACCESS_KEY", "api.services.s3.awsSecretAccessKey", environments],
    ["AWS_ACCESS_KEY_ID", "api.services.aws.awsAccessKeyId", ["prod"]],
    ["AWS_SECRET_ACCESS_KEY", "api.services.aws.awsSecretAccessKey", ["prod"]],
    ["RABBIT_USER", "api.services.rabbit.user", environments],
    ["RABBIT_PASS", "api.services.rabbit.pass", environments],
    ["SMTP_USER", "api.smtp.auth.user", []],
    ["SMTP_PASSWORD", "api.smtp.auth.pass", []],
];

export async function loadConfiguration() {
    const environment = process.env.NYINGARN_ENV;
    if (!environments.includes(environment)) {
        throw new Error(`NYINGARN_ENV must be one of ${environments.join(", ")}`);
    }

    const configuration = await readJSON(`/srv/configuration/${environment}.json`);

    const missing = [];
    for (const [variable, path, requiredIn] of secrets) {
        const value = process.env[variable];
        if (value) {
            setPath(configuration, path, value);
        } else if (requiredIn.includes(environment)) {
            missing.push(variable);
        }
    }
    if (missing.length) {
        throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
    }

    return configuration;
}

function setPath(object, path, value) {
    const keys = path.split(".");
    const last = keys.pop();
    for (const key of keys) object = object[key] ??= {};
    object[last] = value;
}

export async function loadProfile({ profile }) {
    return await readJSON(`/srv/profiles/${profile}`);
}
