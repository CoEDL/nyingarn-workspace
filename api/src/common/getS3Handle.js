import { loadConfiguration } from ".";
import { S3, Bucket } from "./s3";
import { Store } from "@coedl/nocfl-js";

export async function getS3Handle() {
    const configuration = await loadConfiguration();
    let s3 = configuration.api.services.s3;

    let params = {
        bucket: s3.bucket,
        accessKeyId: s3.awsAccessKeyId,
        secretAccessKey: s3.awsSecretAccessKey,
        region: s3.region,
    };
    if (s3.endpointUrl && s3.forcePathStyle) {
        params.endpoint = s3.endpointUrl;
        params.forcePathStyle = s3.forcePathStyle;
    }
    let bucket = new Bucket(params);
    s3 = new S3(params);
    return { s3, bucket };
}

export async function getStoreHandle({ id, className }) {
    const configuration = await loadConfiguration();
    let s3 = configuration.api.services.s3;
    let credentials = {
        bucket: s3.bucket,
        accessKeyId: s3.awsAccessKeyId,
        secretAccessKey: s3.awsSecretAccessKey,
        region: s3.region,
    };
    if (s3.endpointUrl && s3.forcePathStyle) {
        credentials.endpoint = s3.endpointUrl;
        credentials.forcePathStyle = s3.forcePathStyle;
    }
    return new Store({
        id,
        className,
        domain: configuration.api.domain,
        credentials,
    });
}
