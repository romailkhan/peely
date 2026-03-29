#!/usr/bin/env bun

import chalk from "chalk";
import { createCli } from "./cli.js";
import { runReview } from "./reviewer/review.js";
import { printReview } from "./output/terminal.js";

async function main() {
  const { target, options } = createCli();

  console.log(chalk.yellow.bold("\n🍌 Peely — AI Code Reviewer\n"));

  try {
    const { result, context } = await runReview(target, options);
    printReview(result, context);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(chalk.red("\nError: ") + message);
    process.exit(1);
  }
}

main();
