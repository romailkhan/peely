export interface PrTarget {
  type: "pr";
  owner: string;
  repo: string;
  pullNumber: number;
}

export interface RepoTarget {
  type: "repo";
  owner: string;
  repo: string;
  branch?: string;
}

export interface LocalTarget {
  type: "local";
  path: string;
}

export type ReviewTarget = PrTarget | RepoTarget | LocalTarget;

export interface GitHubFile {
  sha: string;
  filename: string;
  status: "added" | "modified" | "removed" | "renamed" | "copied" | "changed" | "unchanged";
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
  blob_url: string;
  raw_url: string;
  contents_url: string;
  previous_filename?: string;
}

export interface GitHubPrDetails {
  title: string;
  body: string | null;
  state: string;
  user: string;
  headSha: string;
  baseSha: string;
  additions: number;
  deletions: number;
  changedFiles: number;
  htmlUrl: string;
}

export interface GitHubTreeEntry {
  path: string;
  mode: string;
  type: "blob" | "tree";
  sha: string;
  size?: number;
}

export interface FileContent {
  path: string;
  content: string;
}

export interface ReviewPayload {
  target: ReviewTarget;
  prDetails?: GitHubPrDetails;
  files: Array<{
    path: string;
    diff?: string;
    content?: string;
    status?: string;
  }>;
}
