import models from "../models";
import { loadConfiguration, getS3Handle } from "../common";

export async function lookupItemByIdentifier({ identifier }) {
    return await models.item.findOne({
        where: { identifier },
        include: [{ model: models.user, attributes: ["id"], raw: true }],
    });
}

export async function getItems({ userId, offset = 0, limit = 10 }) {
    let include = [];
    if (userId) include.push({ model: models.user, where: { id: userId } });
    return await models.item.findAndCountAll({
        offset,
        limit,
        include,
    });
}

export async function createItem({ identifier }) {
    return await models.item.create({ identifier });
}

export async function deleteItem({ id }) {
    await models.item.destroy({ where: { id } });
}

export async function linkItemToUser({ itemId, userId }) {
    return await models.item_user.findOrCreate({
        where: { itemId, userId },
        defaults: { itemId, userId },
    });
}

export async function getItemResources({ identifier }) {
    let { bucket } = await getS3Handle();
    let resources = await bucket.listObjects({ prefix: identifier });
    return { resources: resources.Contents };
}

// export async function createItemLocationInObjectStore({ identifier }) {
//     const configuration = await loadConfiguration();
//     const aws = configuration.api.services.aws;
//     console.log(aws);

//     let params = {
//         bucket: aws.bucket,
//         accessKeyId: aws.accessKeyId,
//         secretAccessKey: aws.secretAccessKey,
//         region: aws.region,
//     };
//     if (aws.endpointUrl && aws.forcePathStyle) {
//         params.endpoint = aws.endpointUrl;
//         params.forcePathStyle = aws.forcePathStyle;
//     }
//     let bucket = new Bucket(params);

//     console.log(identifier);
//     let pathExists = await bucket.pathExists({ path: identifier });
//     console.log(pathExists);
// }
