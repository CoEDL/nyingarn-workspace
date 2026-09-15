const { readFile, writeFile, pathExists, remove } = require("fs-extra");

const development = "/srv/configuration/development-configuration.json";
const backup = `${development}.backup`;

module.exports = async () => {
    if (await pathExists(backup)) {
        await writeFile(development, await readFile(backup));
        await remove(backup);
    }
};
