const { readFile, writeFile, pathExists } = require("fs-extra");

const development = "/srv/configuration/development-configuration.json";
const backup = `${development}.backup`;
const testing = "/srv/configuration/testing-configuration.json";

// writeFile truncates in place, so the host owner and mode of the file survive
module.exports = async () => {
    if (!(await pathExists(backup))) {
        await writeFile(backup, await readFile(development));
    }
    await writeFile(development, await readFile(testing));
};
