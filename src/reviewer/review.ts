import ora from "ora";
import chalk from "chalk";
import { parseTarget, formatTarget } from "../github/parser.js";
import { fetchPrDetails, fetchPrFiles, fetchRepoTree, fetchMultipleFiles } from "../github/api.js";
import { getChangedFiles, getFullCodebase } from "../git/local.js";
import { reviewCode, type ReviewResult } from "../ai/client.js";
import type { CliOptions } from "../cli.js";

interface FileEntry {
  path: string;
  diff?: string;
  content?: string;
  status?: string;
}

interface ReviewContext {
  label: string;
  prTitle?: string;
  prBody?: string | null;
}

export async function runReview(
  target: string,
  options: CliOptions
): Promise<{ result: ReviewResult; context: ReviewContext }> {
  const parsed = parseTarget(target);
  const label = formatTarget(parsed);

  let files: FileEntry[] = [];
  let prTitle: string | undefined;
  let prBody: string | null | undefined;

  switch (parsed.type) {
    case "pr": {
      const spinner = ora("Fetching pull request details...").start();
      try {
        const details = await fetchPrDetails(parsed.owner, parsed.repo, parsed.pullNumber);
        prTitle = details.title;
        prBody = details.body;
        spinner.succeed(
          `PR #${parsed.pullNumber}: ${chalk.bold(details.title)} ` +
          chalk.dim(`(+${details.additions} -${details.deletions}, ${details.changedFiles} files)`)
        );
      } catch (err) {
        spinner.fail("Failed to fetch PR details");
        throw err;
      }

      const fileSpinner = ora("Fetching changed files...").start();
      try {
        const prFiles = await fetchPrFiles(
          parsed.owner, parsed.repo, parsed.pullNumber, options.maxFiles
        );
        files = prFiles.map((f) => ({
          path: f.filename,
          diff: f.patch,
          status: f.status,
        }));
        fileSpinner.succeed(`Fetched ${files.length} changed file(s)`);
      } catch (err) {
        fileSpinner.fail("Failed to fetch PR files");
        throw err;
      }
      break;
    }

    case "repo": {
      const spinner = ora("Fetching repository file tree...").start();
      try {
        const tree = await fetchRepoTree(parsed.owner, parsed.repo, parsed.branch);
        const limited = tree.slice(0, options.maxFiles);
        spinner.succeed(`Found ${tree.length} files, reviewing ${limited.length}`);

        const contentSpinner = ora("Fetching file contents...").start();
        const paths = limited.map((e) => e.path);
        const contents = await fetchMultipleFiles(
          parsed.owner, parsed.repo, paths, parsed.branch
        );
        files = contents.map((f) => ({
          path: f.path,
          content: f.content,
          status: "tracked",
        }));
        contentSpinner.succeed(`Fetched ${files.length} file(s)`);
      } catch (err) {
        spinner.fail("Failed to fetch repository");
        throw err;
      }
      break;
    }

    case "local": {
      const spinner = ora(
        options.full ? "Scanning full codebase..." : "Scanning changed files..."
      ).start();
      try {
        if (options.full) {
          const localFiles = await getFullCodebase(parsed.path, options.maxFiles);
          files = localFiles;
          spinner.succeed(`Found ${files.length} file(s) in codebase`);
        } else {
          const localFiles = await getChangedFiles(parsed.path);
          files = localFiles.slice(0, options.maxFiles);
          spinner.succeed(`Found ${files.length} changed file(s)`);
        }
      } catch (err) {
        spinner.fail("Failed to scan local files");
        throw err;
      }
      break;
    }
  }

  if (files.length === 0) {
    throw new Error("No files to review. If reviewing locally, make sure you have staged or modified files.");
  }

  const reviewSpinner = ora(
    `Reviewing ${files.length} file(s) with ${chalk.cyan(options.model)}...`
  ).start();

  try {
    const result = await reviewCode(files, {
      model: options.model,
      prTitle,
      prBody,
    });
    reviewSpinner.succeed("Review complete");
    return { result, context: { label, prTitle, prBody } };
  } catch (err) {
    reviewSpinner.fail("AI review failed");
    throw err;
  }
}
