import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

// Multi-page build: without this, `npm run build` only includes index.html
const page = (file) => fileURLToPath(new URL(file, import.meta.url));

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: page("./index.html"),
        login: page("./login.html"),
        signup: page("./signup.html"),
      },
    },
  },
});