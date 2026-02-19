export default {
  // display name
  displayName: "backend",

  // when testing backend
  testEnvironment: "node",

  // which test to run
  testMatch: [
    "<rootDir>/controllers/*.test.js",
    "<rootDir>/models/productModel.test.js",
  ],

  // jest code coverage
  collectCoverage: true,
  collectCoverageFrom: [
    "controllers/**",
    "models/productModel.js"
  ],
  coverageThreshold: {
    global: {
      lines: 100,
      functions: 100,
    },
  },
};
