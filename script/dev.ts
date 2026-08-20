// Set this before importing the server so its production/development branches
// see the intended value during module evaluation on every operating system.
process.env.NODE_ENV = "development";

await import("../server/index.ts");