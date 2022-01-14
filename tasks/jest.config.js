module.exports = {
    verbose: true,
    rootDir: "src",
    testMatch: ["**/*.spec.js"],
    testPathIgnorePatterns: ["node_modules"],
    transformIgnorePatterns: ["node_modules", "../api"],
    watchPathIgnorePatterns: ["\\**/.*(?<!spec).js"],
};
