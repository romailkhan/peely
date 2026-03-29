#!/usr/bin/env bun

import chalk from "chalk";
import { createCli } from "./cli.js";
import { runReview } from "./reviewer/review.js";
import { printReview } from "./output/terminal.js";
import { writeMarkdownReport } from "./output/markdown.js";

async function main() {
  const { target, options } = createCli();

  console.log(chalk.yellow.bold("\n🍌 Peely — AI Code Reviewer\n"));

  try {
    const { result, context } = await runReview(target, options);
    printReview(result, context);

    if (options.output) {
      await writeMarkdownReport(options.output, result, {
        ...context,
        model: options.model,
      });
      console.log(chalk.green(`  Report saved to ${chalk.bold(options.output)}\n`));
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(chalk.red("\nError: ") + message);
    process.exit(1);
  }
}

main();
