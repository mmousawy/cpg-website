/**
 * CI entrypoint for release-please with retrying fetch().
 *
 * release-please's GitHub client retries GraphQL 502s but not REST file
 * fetches (manifest/config). GitHub sometimes returns an HTML "Unicorn" page
 * on those REST calls; this wrapper retries before failing.
 */
import * as core from '@actions/core';
import { GitHub, Manifest, VERSION } from 'release-please';

const DEFAULT_CONFIG_FILE = 'release-please-config.json';
const DEFAULT_MANIFEST_FILE = '.release-please-manifest.json';

function installRetryFetch() {
  const originalFetch = globalThis.fetch;
  if (!originalFetch) {
    return;
  }

  globalThis.fetch = async function retryFetch(url, init) {
    const maxAttempts = 5;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const response = await originalFetch(url, init);
      const status = response.status;
      const contentType = response.headers.get('content-type') ?? '';

      if (status < 500 && !contentType.includes('text/html')) {
        return response;
      }

      const body = await response.clone().text();
      const isTransient =
        status >= 500 ||
        body.includes('<!DOCTYPE html>') ||
        body.includes('Unicorn!');

      if (!isTransient) {
        return new Response(body, response);
      }

      core.warning(
        `GitHub API transient error (HTTP ${status}, attempt ${attempt}/${maxAttempts})`
      );

      if (attempt === maxAttempts) {
        return new Response(body, response);
      }

      await new Promise((resolve) => setTimeout(resolve, attempt * 30_000));
    }

    throw new Error('Unreachable');
  };
}

function setPathOutput(path, key, value) {
  if (path === '.') {
    core.setOutput(key, value);
  } else {
    core.setOutput(`${path}--${key}`, value);
  }
}

function outputReleases(releases) {
  const created = releases.filter(Boolean);
  core.setOutput('releases_created', created.length > 0);

  const pathsReleased = [];
  for (const release of created) {
    const path = release.path || '.';
    pathsReleased.push(path);
    setPathOutput(path, 'release_created', true);

    for (const [rawKey, value] of Object.entries(release)) {
      let key = rawKey;
      if (key === 'tagName') key = 'tag_name';
      if (key === 'uploadUrl') key = 'upload_url';
      if (key === 'notes') key = 'body';
      if (key === 'url') key = 'html_url';
      setPathOutput(path, key, value);
    }
  }

  core.setOutput('paths_released', JSON.stringify(pathsReleased));
}

function outputPRs(prs) {
  const created = prs.filter(Boolean);
  core.setOutput('prs_created', created.length > 0);
  if (created.length) {
    core.setOutput('pr', created[0]);
    core.setOutput('prs', JSON.stringify(created));
  }
}

async function main() {
  installRetryFetch();

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error('GITHUB_TOKEN is required');
  }

  const repoUrl = process.env.GITHUB_REPOSITORY;
  if (!repoUrl) {
    throw new Error('GITHUB_REPOSITORY is required');
  }

  const [owner, repo] = repoUrl.split('/');
  const targetBranch = process.env.RELEASE_PLEASE_TARGET_BRANCH || 'main';
  const configFile = process.env.RELEASE_PLEASE_CONFIG_FILE || DEFAULT_CONFIG_FILE;
  const manifestFile =
    process.env.RELEASE_PLEASE_MANIFEST_FILE || DEFAULT_MANIFEST_FILE;

  core.info(`Running release-please version: ${VERSION}`);

  const github = await GitHub.create({
    owner,
    repo,
    token,
    defaultBranch: targetBranch,
  });

  const manifest = await Manifest.fromManifest(
    github,
    targetBranch,
    configFile,
    manifestFile
  );

  core.debug('Creating releases');
  outputReleases(await manifest.createReleases());

  core.debug('Creating pull requests');
  outputPRs(await manifest.createPullRequests());
}

main().catch((error) => {
  core.setFailed(`release-please failed: ${error.message}`);
  process.exit(1);
});
