import { ensureBucket } from "/srv/api/src/common/getS3Handle.js";

export default async function () {
    await ensureBucket();
}
