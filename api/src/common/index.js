import path from "path";
import { ensureDir } from "fs-extra";
export { loadConfiguration, filterPrivateInformation } from "./configuration";
export { getLogger, logEvent } from "./logger";
export { submitTask, registerTask } from "./task";
export { getS3Handle, getStoreHandle } from "./getS3Handle";
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

export async function loadFiles({ prefix, continuationToken }) {
    let { bucket } = await getS3Handle();
    let resources = await bucket.listObjects({ prefix, continuationToken });
    if (resources.NextContinuationToken) {
        return [
            ...resources.Contents,
            ...(await loadFiles({ prefix, continuationToken: resources.NextContinuationToken })),
        ];
    } else {
        return resources.Contents;
    }
}

export async function listObjects({ prefix, continuationToken }) {
    let { bucket } = await getS3Handle();
    let resources = await bucket.listObjects({ prefix, continuationToken });
    if (resources.NextContinuationToken) {
        return [
            ...resources.Contents?.filter((r) => r.Key.match(/nocfl\.identifier\.json/)).map(
                (r) => {
                    return path.basename(path.dirname(r.Key));
                }
            ),
            ...(await listObjects({ prefix, continuationToken: resources.NextContinuationToken })),
        ];
    } else {
        return resources.Contents?.filter((r) => r.Key.match(/nocfl\.identifier\.json/)).map(
            (r) => {
                return path.basename(path.dirname(r.Key));
            }
        );
    }
}
