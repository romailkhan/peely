#!/usr/bin/env bun

import chalk from "chalk";
import { createCli } from "./cli.js";

function main() {
  const { target, options } = createCli();

  console.log(chalk.yellow.bold("\n🍌 Peely — AI Code Reviewer\n"));
  console.log(chalk.dim(`Target:    ${target}`));
  console.log(chalk.dim(`Model:     ${options.model}`));
  console.log(chalk.dim(`Max files: ${options.maxFiles}`));
  if (options.full) console.log(chalk.dim("Mode:      full codebase scan"));
  if (options.output) console.log(chalk.dim(`Output:    ${options.output}`));
  console.log();

  // TODO: wire up review pipeline in later steps
  console.log(chalk.gray("Review pipeline not yet implemented."));
}

main();
