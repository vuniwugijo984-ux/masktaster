import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

function githubPagesBase() {
  if (process.env.PAGES_BASE_PATH) return process.env.PAGES_BASE_PATH;

  const [owner = "", repository = ""] = (process.env.GITHUB_REPOSITORY ?? "").split("/");
  if (!repository) return "/";
  if (repository.toLowerCase() === `${owner.toLowerCase()}.github.io`) return "/";
  return `/${repository}/`;
}

export default defineConfig({
  root: "github-pages",
  base: githubPagesBase(),
  publicDir: "../public",
  plugins: [react()],
  build: {
    outDir: "../pages-dist",
    emptyOutDir: true,
  },
});
