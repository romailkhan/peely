#!/usr/bin/env bun

import chalk from "chalk";
import { createCli } from "./cli.js";
import { runReview } from "./reviewer/review.js";

async function main() {
  const { target, options } = createCli();

  console.log(chalk.yellow.bold("\n🍌 Peely — AI Code Reviewer\n"));

  try {
    const { result, context } = await runReview(target, options);

    // TODO: replace with rich terminal output
    console.log(chalk.bold("\n--- Review Results ---\n"));
    console.log(chalk.bold("Target: ") + context.label);
    console.log(chalk.bold("Score:  ") + result.overallScore + "/10");
    console.log(chalk.bold("Summary: ") + result.summary);
    console.log(chalk.bold(`\nFindings (${result.findings.length}):\n`));
    for (const f of result.findings) {
      const sev = f.severity === "critical" ? chalk.red(f.severity)
        : f.severity === "warning" ? chalk.yellow(f.severity)
        : f.severity === "suggestion" ? chalk.blue(f.severity)
        : chalk.gray(f.severity);
      console.log(`  [${sev}] ${chalk.bold(f.title)}`);
      console.log(`    File: ${f.file}${f.line ? `:${f.line}` : ""}`);
      console.log(`    ${f.description}`);
      if (f.suggestion) console.log(`    ${chalk.green("Fix:")} ${f.suggestion}`);
      console.log();
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(chalk.red("\nError: ") + message);
    process.exit(1);
  }
}

main();
