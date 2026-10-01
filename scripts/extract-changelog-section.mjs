/**
 * Print the CHANGELOG.md section for a version (e.g. 1.41.0) to stdout.
 * Usage: node scripts/extract-changelog-section.mjs 1.41.0
 */
import fs from 'node:fs';

const version = process.argv[2];
if (!version) {
  console.error('Usage: extract-changelog-section.mjs <version>');
  process.exit(1);
}

const changelog = fs.readFileSync('CHANGELOG.md', 'utf8');
const header = `## [${version}]`;
const start = changelog.indexOf(header);
if (start === -1) {
  console.error(`No section ${header} in CHANGELOG.md`);
  process.exit(1);
}

const afterHeader = changelog.indexOf('\n', start) + 1;
const nextHeader = changelog.indexOf('\n## ', afterHeader);
const section = nextHeader === -1
  ? changelog.slice(afterHeader)
  : changelog.slice(afterHeader, nextHeader);

process.stdout.write(section.trim());
