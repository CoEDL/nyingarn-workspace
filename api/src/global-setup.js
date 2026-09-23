import { ensureBucket } from "./common/getS3Handle.js";

export default async function () {
    await ensureBucket();
}
