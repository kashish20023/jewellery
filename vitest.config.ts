import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    /**
     * Vitest loads .env, and a developer's real Cloudinary / S3 credentials would
     * otherwise switch the upload suites onto live storage and fire real network
     * calls. Blanked here (storage treats empty as unconfigured) rather than in
     * setupFiles, because .env is applied to the worker after setup runs. Storage
     * tests set what they need themselves.
     */
    env: {
      CLOUDINARY_CLOUD_NAME: "",
      CLOUDINARY_API_KEY: "",
      CLOUDINARY_API_SECRET: "",
      CLOUDINARY_FOLDER: "",
      STORAGE_ENDPOINT: "",
      STORAGE_BUCKET: "",
      STORAGE_ACCESS_KEY: "",
      STORAGE_SECRET_KEY: "",
      STORAGE_PUBLIC_URL: "",
    },
    environmentOptions: {
      jsdom: {
        url: "http://localhost:3000",
      },
    },
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
  },
});

