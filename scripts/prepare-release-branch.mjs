/**
 * Build version/changelog from commits on staging; apply bumps against main's version files.
 * Writes package.json, CHANGELOG.md, and .release-please-manifest.json in the
 * working tree. Does not push or open PRs — the workflow does that.
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { Manifest } = require('release-please/build/src/manifest.js');
const { GitHub } = require('release-please/build/src/github.js');
const { LocalGitHub } = require('release-please/build/src/local-github.js');

const ROOT = process.cwd();
const CONFIG_FILE = 'release-please-config.json';
const MANIFEST_FILE = '.release-please-manifest.json';
/** Branch release-please treats as the merge base (version files on main). */
const RELEASE_BASE_BRANCH = 'main';
/** Branch whose unreleased commits drive the version/changelog. */
const COMMIT_SOURCE_BRANCH = 'staging';
const PR_BODY_FILE = path.join(ROOT, '.release-pr-body.md');
const PR_TITLE_FILE = path.join(ROOT, '.release-pr-title.txt');

function parseRepo() {
  const fromEnv = process.env.GITHUB_REPOSITORY;
  if (fromEnv?.includes('/')) {
    const [owner, repo] = fromEnv.split('/');
    return { owner, repo };
  }
  throw new Error('GITHUB_REPOSITORY must be set (owner/repo)');
}

async function applyUpdates(github, updates, baseBranch) {
  const changes = await github.buildChangeSet(updates, baseBranch);
  if (changes.size === 0) {
    throw new Error('release-please produced no file changes');
  }
  for (const [relPath, change] of changes) {
    if (!change?.content) {
      throw new Error(`release-please produced no content for ${relPath}`);
    }
    const filePath = path.join(ROOT, relPath);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, change.content, 'utf8');
  }
}

async function main() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error('GITHUB_TOKEN is required');
  }

  const { owner, repo } = parseRepo();
  const github = process.env.GITHUB_ACTIONS
    ? await LocalGitHub.create({ owner, repo, token, localRepoPath: ROOT })
    : await GitHub.create({ owner, repo, token });

  const manifest = await Manifest.fromManifest(
    github,
    COMMIT_SOURCE_BRANCH,
    CONFIG_FILE,
    MANIFEST_FILE,
    { alwaysUpdate: true },
  );

  const pullRequests = await manifest.buildPullRequests();
  if (!pullRequests.length) {
    console.log('No release pull request to build (nothing to release).');
    if (process.env.GITHUB_OUTPUT) {
      fs.appendFileSync(process.env.GITHUB_OUTPUT, 'has_release=false\n');
    }
    return;
  }

  const releasePr = pullRequests[0];
  await applyUpdates(github, releasePr.updates, RELEASE_BASE_BRANCH);

  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  const version = pkg.version;
  const title = releasePr.title.toString();
  const body = releasePr.body.toString();

  fs.writeFileSync(PR_BODY_FILE, body, 'utf8');
  fs.writeFileSync(PR_TITLE_FILE, title, 'utf8');

  console.log(`Prepared release ${version}`);
  console.log(`PR title: ${title}`);

  if (process.env.GITHUB_OUTPUT) {
    const out = [
      'has_release=true',
      `version=${version}`,
      `pr_body_file=${PR_BODY_FILE}`,
      `pr_title_file=${PR_TITLE_FILE}`,
    ].join('\n');
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `${out}\n`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
