import { testDbManager } from "./helpers/testDbManager.js";

export default async function globalSetup({ provide }) {
  console.log("🚀 Starting global test setup...");

  // Set test environment variables
  process.env.NODE_ENV = "test";
  process.env.CB_SECRET = "test-secret-key-for-testing-only";
  process.env.CB_ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef"; // 32-char hex for testing
  process.env.CB_API_HOST = "127.0.0.1";
  process.env.CB_API_PORT = "0"; // Let the system assign a random port

  // Use containerized MySQL by default for testing.
  process.env.CB_DB_DIALECT_DEV = process.env.CB_DB_DIALECT_DEV || "mysql";

  // The global setup owns the container; test workers reuse it via provided
  // connection details instead of starting their own containers.
  delete process.env.CB_TEST_DB_REUSE;

  // Start test database container (will be shared across all tests)
  await testDbManager.start();

  provide("testDbConnection", testDbManager.getConnectionDetails());

  console.log("✅ Global test setup completed");

  return async () => {
    console.log("🧹 Starting global test teardown...");
    await testDbManager.stop();
    console.log("✅ Global test teardown completed");
  };
}
