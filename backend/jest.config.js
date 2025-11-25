export default {
    testEnvironment: 'node',
    transform: {},
    testMatch: ['**/tests/**/*.test.js'],
    collectCoverageFrom: [
      'routes/**/*.js',
      'models/**/*.js',
      '!**/node_modules/**'
    ]
  };