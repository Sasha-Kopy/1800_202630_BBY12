import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

// Multi-page build: every HTML page must be listed or it won't exist in dist/
const page = (file) => fileURLToPath(new URL(file, import.meta.url));

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: page("./index.html"),
        home: page("./home.html"),
        dashboard: page("./dashboard.html"),
        savings: page("./Savings.html"),
        settings: page("./settings.html"),
        login: page("./login.html"),
        signup: page("./signup.html"),
      },
    },
  },
});
