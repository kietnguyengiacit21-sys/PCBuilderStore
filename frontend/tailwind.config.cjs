const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const themeContext = { tailwind: {} };
const themeConfig = fs.readFileSync(
  path.join(__dirname, "components", "theme-config.js"),
  "utf8",
);
vm.runInNewContext(themeConfig, themeContext, {
  filename: "components/theme-config.js",
});

module.exports = {
  ...themeContext.tailwind.config,
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./C01-C17/**/*.html",
    "./A01-A15/**/*.html",
    "./B01-B08/**/*.html",
  ],
};
