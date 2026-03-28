import type {
  GitHubFile,
  GitHubPrDetails,
  GitHubTreeEntry,
  FileContent,
} from "./types.js";

const API_BASE = "https://api.github.com";
const API_VERSION = "2022-11-28";

const BINARY_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".svg",
  ".woff", ".woff2", ".ttf", ".eot", ".otf",
  ".zip", ".tar", ".gz", ".bz2", ".7z",
  ".pdf", ".doc", ".docx", ".xls", ".xlsx",
  ".mp3", ".mp4", ".wav", ".avi", ".mov",
  ".exe", ".dll", ".so", ".dylib",
  ".lock",
]);

const MAX_FILE_SIZE = 100_000; // 100KB

function getToken(): string {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error(
      "GITHUB_TOKEN environment variable is required for GitHub URLs.\n" +
      "Set it in your .env file or export it: export GITHUB_TOKEN=ghp_..."
    );
  }
  return token;
}

function headers(): Record<string, string> {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${getToken()}`,
    "X-GitHub-Api-Version": API_VERSION,
  };
}

async function ghFetch<T>(path: string): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, { headers: headers() });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub API error (${res.status}): ${body}`);
  }

  return res.json() as Promise<T>;
}

async function ghFetchPaginated<T>(path: string, maxPages = 10): Promise<T[]> {
  const results: T[] = [];
  let url: string | null = `${API_BASE}${path}`;
  const sep = path.includes("?") ? "&" : "?";
  url += `${sep}per_page=100`;
  let page = 0;

  while (url && page < maxPages) {
    const res = await fetch(url, { headers: headers() });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`GitHub API error (${res.status}): ${body}`);
    }

    const data = (await res.json()) as T[];
    results.push(...data);

    const linkHeader = res.headers.get("Link");
    url = parseLinkNext(linkHeader);
    page++;
  }

  return results;
}

function parseLinkNext(linkHeader: string | null): string | null {
  if (!linkHeader) return null;
  const match = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
  return match ? match[1] : null;
}

function isBinaryFile(filename: string): boolean {
  const ext = filename.slice(filename.lastIndexOf(".")).toLowerCase();
  return BINARY_EXTENSIONS.has(ext);
}

// --- Pull Request APIs ---

export async function fetchPrDetails(
  owner: string,
  repo: string,
  pullNumber: number
): Promise<GitHubPrDetails> {
  const data = await ghFetch<Record<string, any>>(
    `/repos/${owner}/${repo}/pulls/${pullNumber}`
  );

  return {
    title: data.title,
    body: data.body,
    state: data.state,
    user: data.user?.login ?? "unknown",
    headSha: data.head?.sha ?? "",
    baseSha: data.base?.sha ?? "",
    additions: data.additions ?? 0,
    deletions: data.deletions ?? 0,
    changedFiles: data.changed_files ?? 0,
    htmlUrl: data.html_url,
  };
}

export async function fetchPrFiles(
  owner: string,
  repo: string,
  pullNumber: number,
  maxFiles: number
): Promise<GitHubFile[]> {
  const files = await ghFetchPaginated<GitHubFile>(
    `/repos/${owner}/${repo}/pulls/${pullNumber}/files`
  );

  return files
    .filter((f) => !isBinaryFile(f.filename))
    .slice(0, maxFiles);
}

// --- Repository APIs ---

export async function fetchRepoTree(
  owner: string,
  repo: string,
  branch?: string
): Promise<GitHubTreeEntry[]> {
  const ref = branch ?? "HEAD";
  const data = await ghFetch<{ tree: GitHubTreeEntry[]; truncated: boolean }>(
    `/repos/${owner}/${repo}/git/trees/${ref}?recursive=1`
  );

  return data.tree.filter(
    (entry) =>
      entry.type === "blob" &&
      !isBinaryFile(entry.path) &&
      (entry.size ?? 0) <= MAX_FILE_SIZE
  );
}

export async function fetchFileContent(
  owner: string,
  repo: string,
  path: string,
  ref?: string
): Promise<FileContent> {
  const query = ref ? `?ref=${ref}` : "";
  const data = await ghFetch<{ content: string; encoding: string }>(
    `/repos/${owner}/${repo}/contents/${path}${query}`
  );

  if (data.encoding !== "base64") {
    throw new Error(`Unexpected encoding for ${path}: ${data.encoding}`);
  }

  const content = Buffer.from(data.content, "base64").toString("utf-8");
  return { path, content };
}

export async function fetchMultipleFiles(
  owner: string,
  repo: string,
  paths: string[],
  ref?: string
): Promise<FileContent[]> {
  const results: FileContent[] = [];
  const batchSize = 5;

  for (let i = 0; i < paths.length; i += batchSize) {
    const batch = paths.slice(i, i + batchSize);
    const fetched = await Promise.all(
      batch.map((p) =>
        fetchFileContent(owner, repo, p, ref).catch(() => null)
      )
    );
    for (const f of fetched) {
      if (f) results.push(f);
    }
  }

  return results;
}
