export default {
  // name displayed during tests
  displayName: "frontend",

  // simulates browser environment in jest
  // e.g., using document.querySelector in your tests
  testEnvironment: "jest-environment-jsdom",

  // jest does not recognise jsx files by default, so we use babel to transform any jsx files
  transform: {
    "^.+\\.jsx?$": "babel-jest",
  },

  // tells jest how to handle css/scss imports in your tests
  moduleNameMapper: {
    "\\.(css|scss)$": "identity-obj-proxy",
  },

  // ignore all node_modules except styleMock (needed for css imports)
  transformIgnorePatterns: ["/node_modules/(?!(styleMock\\.js)$)"],

  // only run these tests
  testMatch: [
    "<rootDir>/client/src/pages/Auth/*.test.js",
    "<rootDir>/client/src/pages/CategoryProduct.test.js",
    "<rootDir>/client/src/pages/ProductDetails.test.js",
    "<rootDir>/client/src/pages/Contact.test.js",
    "<rootDir>/client/src/pages/Policy.test.js",
  ],

  // jest code coverage
  collectCoverage: true,
  collectCoverageFrom: [
    "client/src/pages/Auth/**",
    "client/src/pages/CategoryProduct.js",
    "client/src/pages/ProductDetails.js",
    "client/src/pages/Contact.js",
    "client/src/pages/Policy.js"
  ],
  coverageThreshold: {
    global: {
      lines: 100,   // Line coverage threshold
      functions: 100, // Function coverage threshold
    },
  },
  setupFilesAfterEnv: ["<rootDir>/client/src/setupTests.js"],
};
