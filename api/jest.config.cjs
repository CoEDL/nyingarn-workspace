module.exports = {
    verbose: true,
    rootDir: "src",
    testMatch: ["**/*.spec.js"],
    globalSetup: "<rootDir>/global-setup.js",
    testPathIgnorePatterns: ["node_modules"],
    watchPathIgnorePatterns: ["\\**/.*(?<!spec).js"],
    transform: {
        "\\.[jt]sx?$": ["babel-jest", { rootMode: "upward" }],
    },
};
