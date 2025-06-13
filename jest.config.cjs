module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  setupFilesAfterEnv: ["<rootDir>/tests/setup.ts"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  testMatch: ["**/tests/**/*.test.ts"],
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/*.d.ts",
    "!src/**/*.test.ts",
    "!src/**/index.ts", // Exclude barrel exports from coverage requirements
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html", "json"],
  coverageThreshold: {
    global: {
      branches: 65,
      functions: 35,
      lines: 70,
      statements: 70,
    },
    // Core models should have high coverage
    "./src/models/": {
      branches: 65,
      functions: 85,
      lines: 70,
      statements: 70,
    },
    // Utility files have lower coverage for now, can be improved
    "./src/utils/": {
      branches: 2,
      functions: 5,
      lines: 15,
      statements: 15,
    },
  },
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        tsconfig: {
          module: "commonjs",
        },
      },
    ],
  },
};
