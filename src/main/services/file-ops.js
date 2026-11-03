'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { ensureDirectory, uniqueDestination } = require('./path-utils');

async function moveFile(sourcePath, destinationDirectory) {
  ensureDirectory(destinationDirectory);
  const destinationPath = uniqueDestination(destinationDirectory, path.basename(sourcePath));
  try {
    await fs.promises.rename(sourcePath, destinationPath);
  } catch (error) {
    if (error.code !== 'EXDEV') throw error;
    await fs.promises.copyFile(sourcePath, destinationPath);
    await fs.promises.unlink(sourcePath);
  }
  return destinationPath;
}

async function replaceFile(sourcePath, destinationPath) {
  ensureDirectory(path.dirname(destinationPath));
  await fs.promises.rm(destinationPath, { force: true });
  try {
    await fs.promises.rename(sourcePath, destinationPath);
  } catch (error) {
    if (error.code !== 'EXDEV') throw error;
    await fs.promises.copyFile(sourcePath, destinationPath);
    await fs.promises.unlink(sourcePath);
  }
}

module.exports = { moveFile, replaceFile };
