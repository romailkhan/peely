import type { ReviewTarget } from "./types.js";

const PR_PATTERN = /github\.com\/([^\/]+)\/([^\/]+)\/pull\/(\d+)/;
const REPO_PATTERN = /github\.com\/([^\/]+)\/([^\/]+)\/?$/;
const REPO_BRANCH_PATTERN = /github\.com\/([^\/]+)\/([^\/]+)\/tree\/([^\/]+)/;

export function parseTarget(input: string): ReviewTarget {
  const cleaned = input.replace(/\/$/, "").replace(/\.git$/, "");

  const prMatch = cleaned.match(PR_PATTERN);
  if (prMatch) {
    return {
      type: "pr",
      owner: prMatch[1],
      repo: prMatch[2],
      pullNumber: parseInt(prMatch[3], 10),
    };
  }

  const branchMatch = cleaned.match(REPO_BRANCH_PATTERN);
  if (branchMatch) {
    return {
      type: "repo",
      owner: branchMatch[1],
      repo: branchMatch[2],
      branch: branchMatch[3],
    };
  }

  const repoMatch = cleaned.match(REPO_PATTERN);
  if (repoMatch) {
    return {
      type: "repo",
      owner: repoMatch[1],
      repo: repoMatch[2],
    };
  }

  if (cleaned.startsWith("https://github.com") || cleaned.startsWith("http://github.com")) {
    throw new Error(`Could not parse GitHub URL: ${input}`);
  }

  return {
    type: "local",
    path: cleaned === "." ? process.cwd() : cleaned,
  };
}

export function formatTarget(target: ReviewTarget): string {
  switch (target.type) {
    case "pr":
      return `${target.owner}/${target.repo}#${target.pullNumber}`;
    case "repo":
      return `${target.owner}/${target.repo}${target.branch ? ` (${target.branch})` : ""}`;
    case "local":
      return target.path;
  }
}
