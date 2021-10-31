import { loadConfiguration } from ".";
import { S3, Bucket } from "./s3";

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
