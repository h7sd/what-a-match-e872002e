const fs = require('fs');
const path = require('path');

const SOURCE = '/vercel/share/v0-project/src';
const DEST = '/vercel/share/v0-next-shadcn/src';

function copyDirRecursive(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

copyDirRecursive(SOURCE, DEST);

// Also copy index.html and vite.config.ts
const rootFiles = ['index.html'];
for (const file of rootFiles) {
  const src = path.join('/vercel/share/v0-project', file);
  const dest = path.join('/vercel/share/v0-next-shadcn', file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
  }
}

console.log('Done syncing files');
