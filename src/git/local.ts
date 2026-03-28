import { $ } from "bun";
import { readdir, readFile, stat } from "node:fs/promises";
import { join, extname, resolve } from "node:path";

const BINARY_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".svg",
  ".woff", ".woff2", ".ttf", ".eot", ".otf",
  ".zip", ".tar", ".gz", ".bz2", ".7z",
  ".pdf", ".doc", ".docx", ".xls", ".xlsx",
  ".mp3", ".mp4", ".wav", ".avi", ".mov",
  ".exe", ".dll", ".so", ".dylib",
  ".lock",
]);

const MAX_FILE_SIZE = 100_000;

interface LocalFile {
  path: string;
  diff?: string;
  content?: string;
  status?: string;
}

async function run(cmd: string[], cwd: string): Promise<string> {
  const proc = Bun.spawn(cmd, {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
  });
  const stdout = await new Response(proc.stdout).text();
  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    const stderr = await new Response(proc.stderr).text();
    throw new Error(`Command failed: ${cmd.join(" ")}\n${stderr}`);
  }
  return stdout.trim();
}

function isBinary(filename: string): boolean {
  const ext = extname(filename).toLowerCase();
  return BINARY_EXTENSIONS.has(ext);
}

async function isGitRepo(cwd: string): Promise<boolean> {
  try {
    await run(["git", "rev-parse", "--is-inside-work-tree"], cwd);
    return true;
  } catch {
    return false;
  }
}

export async function getChangedFiles(cwd: string): Promise<LocalFile[]> {
  const absPath = resolve(cwd);

  if (!(await isGitRepo(absPath))) {
    throw new Error(`Not a git repository: ${absPath}`);
  }

  const stagedNames = await run(
    ["git", "diff", "--cached", "--name-only"],
    absPath
  );
  const unstagedNames = await run(
    ["git", "diff", "--name-only"],
    absPath
  );

  const allNames = new Set<string>();
  for (const name of stagedNames.split("\n").filter(Boolean)) allNames.add(name);
  for (const name of unstagedNames.split("\n").filter(Boolean)) allNames.add(name);

  if (allNames.size === 0) {
    const untrackedOutput = await run(
      ["git", "ls-files", "--others", "--exclude-standard"],
      absPath
    );
    for (const name of untrackedOutput.split("\n").filter(Boolean)) allNames.add(name);
  }

  if (allNames.size === 0) {
    return [];
  }

  const files: LocalFile[] = [];

  for (const name of allNames) {
    if (isBinary(name)) continue;

    try {
      const filePath = join(absPath, name);
      const fileStat = await stat(filePath).catch(() => null);

      if (!fileStat || fileStat.size > MAX_FILE_SIZE) continue;

      let diff = "";
      try {
        diff = await run(["git", "diff", "--cached", "--", name], absPath);
        if (!diff) {
          diff = await run(["git", "diff", "--", name], absPath);
        }
      } catch {
        // untracked files won't have a diff
      }

      const content = await readFile(filePath, "utf-8");

      files.push({
        path: name,
        diff: diff || undefined,
        content,
        status: diff ? "modified" : "untracked",
      });
    } catch {
      // skip files that can't be read
    }
  }

  return files;
}

export async function getFullCodebase(
  cwd: string,
  maxFiles: number
): Promise<LocalFile[]> {
  const absPath = resolve(cwd);

  let filePaths: string[];

  if (await isGitRepo(absPath)) {
    const output = await run(["git", "ls-files"], absPath);
    filePaths = output.split("\n").filter(Boolean);
  } else {
    filePaths = await walkDir(absPath, absPath);
  }

  const files: LocalFile[] = [];

  for (const relPath of filePaths) {
    if (files.length >= maxFiles) break;
    if (isBinary(relPath)) continue;

    try {
      const fullPath = join(absPath, relPath);
      const fileStat = await stat(fullPath);

      if (fileStat.size > MAX_FILE_SIZE) continue;

      const content = await readFile(fullPath, "utf-8");
      files.push({
        path: relPath,
        content,
        status: "tracked",
      });
    } catch {
      // skip unreadable files
    }
  }

  return files;
}

const IGNORED_DIRS = new Set([
  "node_modules", ".git", "dist", "build", ".next",
  "__pycache__", ".venv", "venv", "vendor",
  ".cache", "coverage", ".turbo",
]);

async function walkDir(dir: string, root: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const paths: string[] = [];

  for (const entry of entries) {
    if (entry.name.startsWith(".") && entry.name !== ".env.example") continue;
    if (IGNORED_DIRS.has(entry.name)) continue;

    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      const subPaths = await walkDir(fullPath, root);
      paths.push(...subPaths);
    } else if (entry.isFile()) {
      const relPath = fullPath.slice(root.length + 1);
      paths.push(relPath);
    }
  }

  return paths;
}
