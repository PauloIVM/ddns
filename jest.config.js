module.exports = {
    preset: "ts-jest",
    testEnvironment: "node",
    collectCoverage: true,
    collectCoverageFrom: ["./src/**/*.{ts}"],
    testMatch: ["**/*.test.ts"],
    roots: ["<rootDir>src"],
    globals: {
        "ts-jest": {
            tsconfig: "tsconfig.json",
        },
    },
};