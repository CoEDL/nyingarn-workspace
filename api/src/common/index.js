import path from "path";
import { ensureDir } from "fs-extra";
export { loadConfiguration, filterPrivateInformation } from "./configuration";
export { getLogger, logEvent } from "./logger";
export { submitTask, registerTask } from "./task";
export { getS3Handle } from "./getS3Handle";
import { getS3Handle } from "./getS3Handle";
export {
    route,
    routeAdmin,
    demandAuthenticatedUser,
    demandAdministrator,
    requireIdentifierAccess,
} from "./middleware";
export { generateToken, verifyToken } from "./jwt";
export {
    host,
    setupBeforeAll,
    setupBeforeEach,
    teardownAfterAll,
    teardownAfterEach,
    generateLogs,
    setupTestItem,
} from "./test-utils";

export async function getUserTempLocation({ userId }) {
    if (!userId) {
        throw new Error(`'userId' must be provided`);
    }
    let tempdir = path.join("/srv", "tmp", userId);
    await ensureDir(tempdir);
    return tempdir;
}

export async function loadFiles({ continuationToken }) {
    let { bucket } = await getS3Handle();
    let resources = await bucket.listObjects({ continuationToken });
    if (resources.NextContinuationToken) {
        return [
            ...resources.Contents,
            ...(await loadItems({ continuationToken: resources.NextContinuationToken })),
        ];
    } else {
        return resources.Contents;
    }
}
