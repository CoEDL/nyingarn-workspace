import path from "path";
import { ensureDir } from "fs-extra";
export { loadConfiguration, filterPrivateInformation } from "./configuration";
export { getLogger, logEvent, registerTask } from "./logger";
export { getS3Handle } from "./getS3Handle";
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
} from "./test-utils";

export async function getUserTempLocation({ userId }) {
    if (!userId) {
        throw new Error(`'userId' must be provided`);
    }
    let tempdir = path.join("/srv", "tmp", userId);
    await ensureDir(tempdir);
    return tempdir;
}
