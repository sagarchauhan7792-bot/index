/**
 * github.js — GitHub API wrapper using Octokit
 * Reads and writes files in the Revnox repo via GitHub API.
 */

const { Octokit } = require('@octokit/rest');

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
const OWNER = process.env.REPO_OWNER || 'sagarchauhan7792-bot';
const REPO  = process.env.REPO_NAME  || 'index';
const BRANCH = process.env.REPO_BRANCH || 'master';

/**
 * Get a file's content and SHA from GitHub.
 * Returns { content: string (decoded), sha: string }
 */
async function getFile(filePath) {
  const res = await octokit.repos.getContent({
    owner: OWNER, repo: REPO, path: filePath, ref: BRANCH,
  });
  const content = Buffer.from(res.data.content, 'base64').toString('utf8');
  return { content, sha: res.data.sha };
}

/**
 * Write (create or update) a file on GitHub.
 * If the file already exists, pass its current SHA.
 */
async function putFile(filePath, content, message, sha) {
  const encoded = Buffer.from(content, 'utf8').toString('base64');
  await octokit.repos.createOrUpdateFileContents({
    owner: OWNER, repo: REPO, path: filePath,
    message,
    content: encoded,
    sha,
    branch: BRANCH,
  });
}

/**
 * Read content.json from repo, parse and return as object.
 */
async function getContent() {
  const { content, sha } = await getFile('content.json');
  return { data: JSON.parse(content), sha };
}

/**
 * Write updated content object back to content.json in repo.
 */
async function saveContent(data, sha) {
  const json = JSON.stringify(data, null, 2);
  await putFile('content.json', json, 'cms: update content.json via admin panel', sha);
}

/**
 * Upload an image file (Buffer) to /assets/ in repo.
 * Returns the public URL on GitHub Pages.
 */
async function uploadImage(filename, buffer) {
  let sha;
  try {
    const existing = await getFile(`assets/${filename}`);
    sha = existing.sha;
  } catch (_) {
    sha = undefined;
  }
  const encoded = buffer.toString('base64');
  await octokit.repos.createOrUpdateFileContents({
    owner: OWNER, repo: REPO,
    path: `assets/${filename}`,
    message: `cms: upload image ${filename}`,
    content: encoded,
    sha,
    branch: BRANCH,
  });
  return `https://www.revnoxmedia.com/assets/${filename}`;
}

module.exports = { getContent, saveContent, uploadImage };
