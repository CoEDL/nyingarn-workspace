import { loadConfiguration } from ".";
import { S3, Bucket } from "../lib/s3";

export async function getS3Handle() {
    const configuration = await loadConfiguration();
    const aws = configuration.api.services.aws;

    let params = {
        bucket: aws.bucket,
        accessKeyId: aws.accessKeyId,
        secretAccessKey: aws.secretAccessKey,
        region: aws.region,
    };
    if (aws.endpointUrl && aws.forcePathStyle) {
        params.endpoint = aws.endpointUrl;
        params.forcePathStyle = aws.forcePathStyle;
    }
    let bucket = new Bucket(params);
    let s3 = new S3(params);
    return { s3, bucket };
}
