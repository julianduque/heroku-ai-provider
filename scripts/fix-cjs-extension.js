import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const cjsDir = path.resolve(__dirname, "../dist/cjs");

// Add .cjs extension to import statements in CJS files
function processDirectory(directory) {
  if (!fs.existsSync(directory)) {
    console.log("CJS directory does not exist, skipping...");
    return;
  }

  const files = fs.readdirSync(directory);

  for (const file of files) {
    const filePath = path.join(directory, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      processDirectory(filePath);
    } else if (file.endsWith(".js")) {
      let content = fs.readFileSync(filePath, "utf8");

      // Fix relative imports to use .cjs extension
      content = content.replace(/from\s+['"](\..+?)\.js['"]/g, "from '$1.cjs'");
      content = content.replace(
        /require\(['"](\..+?)\.js['"]\)/g,
        "require('$1.cjs')",
      );

      // Fix relative imports without extension to use .cjs
      content = content.replace(
        /from\s+['"](\..+?)(?<!\.cjs|\.js)['"]/g,
        "from '$1.cjs'",
      );
      content = content.replace(
        /require\(['"](\..+?)(?<!\.cjs|\.js)['"]\)/g,
        "require('$1.cjs')",
      );

      fs.writeFileSync(filePath, content);

      // Rename .js files to .cjs
      const newFilePath = filePath.replace(/\.js$/, ".cjs");
      fs.renameSync(filePath, newFilePath);
      console.log(`Renamed ${file} to ${path.basename(newFilePath)}`);
    }
  }
}

// Also rename .d.ts files to .d.cts for CommonJS
function renameDeclarationFiles(directory) {
  if (!fs.existsSync(directory)) {
    return;
  }

  const files = fs.readdirSync(directory);

  for (const file of files) {
    const filePath = path.join(directory, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      renameDeclarationFiles(filePath);
    } else if (file.endsWith(".d.ts")) {
      const newFilePath = filePath.replace(/\.d\.ts$/, ".d.cts");
      fs.renameSync(filePath, newFilePath);
      console.log(`Renamed ${file} to ${path.basename(newFilePath)}`);
    }
  }
}

console.log("Processing CJS directory:", cjsDir);
processDirectory(cjsDir);
renameDeclarationFiles(cjsDir);
console.log("CJS extensions fixed successfully");
