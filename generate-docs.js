/**
 * Requires jsdoc and jsdoc-to-markdown
 */

/* eslint-disable no-console */
import fs from 'fs';

import path from 'path';
import glob from 'glob';
import { execSync } from 'child_process';

/**
 * Runs through packages folders looking for JSDoc and generates markdown docs
 */
function generateDocs() {
  console.log('Generating package docs')
  // Use glob to get all js/ts files
  const pathPattern = path.join(process.cwd(), './lib/**/*.[jt]s?(x)')
  const filePaths = glob.sync(pathPattern, {
    ignore: [
      '**/node_modules/**',
      '**/cypress/**',
      '**/__tests__/**',
      '**/*.test.js',
      '**/*_spec.js',
    ],
  })

  for(const file of filePaths) {
    const { base: fileName } = path.parse(file);

    const relativePath = path.relative(process.cwd(), file);
    const markdown = execSync(`./node_modules/.bin/jsdoc2md ${relativePath}`);

    const writeDir = path.join(
      process.cwd(),
      `website/docs/api/${relativePath.replace(fileName, '')}`,
    )

    // check if the directory exists
    if (!fs.existsSync(writeDir)) {
      // create the directory
      fs.mkdirSync(writeDir, { recursive: true })
    }

    // write the markdown file
    fs.writeFileSync(`${writeDir}/${fileName}.md`, markdown)
  }
  
  // Let the user know what step we're on
  console.log('\u001B[32m', '✔️ Package docs generated', '\u001B[0m')
}

generateDocs()
process.exit(0)