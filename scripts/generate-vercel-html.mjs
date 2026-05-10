import { readdirSync, writeFileSync } from "fs";

const assetsDir = "dist/client/assets";
const outputPath = "dist/client/index.html";

const files = readdirSync(assetsDir);
const cssFiles = files.filter((f) => f.endsWith(".css"));
const jsFiles = files.filter((f) => f.endsWith(".js"));

// Build script and link tags
const linkTags = cssFiles.map((f) => `  <link rel="stylesheet" href="/assets/${f}">`).join("\n");
const scriptTags = jsFiles
  .map((f) => `  <script type="module" src="/assets/${f}"></script>`)
  .join("\n");

const html = `<!DOCTYPE html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Cabinet Configurator</title>
${linkTags}
  </head>
  <body>
    <div id="root"></div>
${scriptTags}
  </body>
</html>
`;

writeFileSync(outputPath, html);
console.log(`Generated ${outputPath}`);
console.log(`  CSS: ${cssFiles.join(", ")}`);
console.log(`  JS:  ${jsFiles.join(", ")}`);
