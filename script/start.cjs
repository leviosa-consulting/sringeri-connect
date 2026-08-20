// Keep production mode set before the bundled server and its dependencies load.
process.env.NODE_ENV = "production";
require("../dist/index.cjs");