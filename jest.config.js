module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/types.ts',
    '!**/node_modules/**'
  ],
  coverageReporters: ['text', 'lcov', 'clover'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 70, // Lowered to 70% due to exports in index.ts being counted as functions
      lines: 80,
      statements: 80
    },
    './src/client.ts': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    './src/errors.ts': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    './src/utils.ts': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
