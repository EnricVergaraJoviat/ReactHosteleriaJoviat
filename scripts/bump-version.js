const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const packageJsonPath = path.join(rootDir, 'package.json');
const packageLockPath = path.join(rootDir, 'package-lock.json');
const appVersionPath = path.join(rootDir, 'src', 'appVersion.js');

function bumpPatchVersion(version) {
  const [major, minor, patch] = String(version).split('.').map(Number);

  if ([major, minor, patch].some((value) => Number.isNaN(value))) {
    throw new Error(`Invalid semver version: ${version}`);
  }

  return `${major}.${minor}.${patch + 1}`;
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const nextVersion = bumpPatchVersion(packageJson.version);

packageJson.version = nextVersion;
writeJson(packageJsonPath, packageJson);

if (fs.existsSync(packageLockPath)) {
  const packageLock = JSON.parse(fs.readFileSync(packageLockPath, 'utf8'));
  packageLock.version = nextVersion;

  if (packageLock.packages && packageLock.packages['']) {
    packageLock.packages[''].version = nextVersion;
  }

  writeJson(packageLockPath, packageLock);
}

fs.writeFileSync(appVersionPath, `export const APP_VERSION = '${nextVersion}';\n`);

process.stdout.write(`${nextVersion}\n`);
