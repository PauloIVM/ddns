module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    collectCoverage: true,
    collectCoverageFrom: ['./src/**/*.{ts}'],
    testMatch: ["**/*.test.{ts}"],
    globals: {
        'ts-jest': {
            tsconfig: 'tsconfig.test.json'
        },
    },
};