import { Command } from "commander";
import chalk from "chalk";

export interface CliOptions {
  full: boolean;
  output?: string;
  model: string;
  maxFiles: number;
}

export interface CliResult {
  target: string;
  options: CliOptions;
}

export function createCli(): CliResult {
  const program = new Command();

  program
    .name("peely")
    .version("0.1.0")
    .description(
      chalk.yellow("🍌 Peely") +
        " — AI-powered code reviewer.\n" +
        "  Pass a GitHub PR URL, repo URL, or local path to review code."
    )
    .argument("<target>", "GitHub PR URL, repo URL, or local path (use '.' for cwd)")
    .option("--full", "scan the full codebase instead of just staged/changed files", false)
    .option("-o, --output <file>", "export the review to a markdown file")
    .option("-m, --model <name>", "OpenRouter model to use", "openai/gpt-4.1")
    .option("--max-files <n>", "maximum number of files to review", "20")
    .parse();

  const target = program.args[0];

  if (!target) {
    program.help();
    process.exit(1);
  }

  const opts = program.opts();

  return {
    target,
    options: {
      full: opts.full,
      output: opts.output,
      model: opts.model,
      maxFiles: parseInt(opts.maxFiles, 10),
    },
  };
}
