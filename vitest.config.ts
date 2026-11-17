import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    include: ["shared/**/*.test.ts", "server/**/*.test.ts", "api/**/*.test.ts"],
    testTimeout: 60000,
    hookTimeout: 120000,
    fileParallelism: false,
  },
});
