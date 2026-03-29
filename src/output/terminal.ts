import chalk from "chalk";
import type { ReviewResult, ReviewFinding } from "../ai/client.js";

const SEVERITY_BADGE: Record<ReviewFinding["severity"], string> = {
  critical: chalk.bgRed.white.bold(" CRITICAL "),
  warning: chalk.bgYellow.black.bold(" WARNING "),
  suggestion: chalk.bgBlue.white.bold(" SUGGESTION "),
  nitpick: chalk.bgGray.white(" NITPICK "),
};

const SEVERITY_ORDER: ReviewFinding["severity"][] = [
  "critical",
  "warning",
  "suggestion",
  "nitpick",
];

function scoreColor(score: number): string {
  if (score >= 8) return chalk.green.bold(String(score));
  if (score >= 5) return chalk.yellow.bold(String(score));
  return chalk.red.bold(String(score));
}

function scoreBar(score: number): string {
  const filled = score;
  const empty = 10 - score;
  const bar =
    chalk.green("█".repeat(Math.min(filled, 8))) +
    (filled > 8 ? chalk.green("█".repeat(filled - 8)) : "") +
    chalk.gray("░".repeat(empty));

  if (score < 5) {
    return chalk.red("█".repeat(filled)) + chalk.gray("░".repeat(empty));
  }
  if (score < 8) {
    return chalk.yellow("█".repeat(filled)) + chalk.gray("░".repeat(empty));
  }
  return bar;
}

function divider(): string {
  return chalk.gray("─".repeat(60));
}

export function printReview(
  result: ReviewResult,
  context: { label: string; prTitle?: string }
): void {
  console.log("\n" + divider());
  console.log(chalk.yellow.bold("  🍌 Peely Review"));
  console.log(divider());

  console.log();
  console.log(chalk.bold("  Target:  ") + context.label);
  if (context.prTitle) {
    console.log(chalk.bold("  PR:      ") + context.prTitle);
  }

  console.log();
  console.log(chalk.bold("  Score:   ") + scoreColor(result.overallScore) + chalk.dim("/10") + "  " + scoreBar(result.overallScore));
  console.log();
  console.log(chalk.bold("  Summary"));
  console.log("  " + result.summary);
  console.log();

  if (result.findings.length === 0) {
    console.log(chalk.green.bold("  No issues found. Looks good! 🎉"));
    console.log("\n" + divider() + "\n");
    return;
  }

  const counts = { critical: 0, warning: 0, suggestion: 0, nitpick: 0 };
  for (const f of result.findings) {
    counts[f.severity]++;
  }

  const countParts: string[] = [];
  if (counts.critical > 0) countParts.push(chalk.red(`${counts.critical} critical`));
  if (counts.warning > 0) countParts.push(chalk.yellow(`${counts.warning} warning`));
  if (counts.suggestion > 0) countParts.push(chalk.blue(`${counts.suggestion} suggestion`));
  if (counts.nitpick > 0) countParts.push(chalk.gray(`${counts.nitpick} nitpick`));

  console.log(chalk.bold(`  Findings (${result.findings.length}): `) + countParts.join(chalk.dim(" · ")));
  console.log();

  const grouped = new Map<ReviewFinding["severity"], ReviewFinding[]>();
  for (const sev of SEVERITY_ORDER) {
    const items = result.findings.filter((f) => f.severity === sev);
    if (items.length > 0) grouped.set(sev, items);
  }

  for (const [severity, findings] of grouped) {
    console.log("  " + SEVERITY_BADGE[severity]);
    console.log();

    for (let i = 0; i < findings.length; i++) {
      const f = findings[i];
      const location = f.line ? `${f.file}:${f.line}` : f.file;

      console.log(`    ${chalk.bold(f.title)}`);
      console.log(`    ${chalk.dim(location)}`);
      console.log();

      const descLines = f.description.split("\n");
      for (const line of descLines) {
        console.log(`    ${line}`);
      }

      if (f.suggestion) {
        console.log();
        console.log(`    ${chalk.green("→")} ${chalk.green(f.suggestion)}`);
      }

      if (i < findings.length - 1) {
        console.log();
        console.log("    " + chalk.gray("· · ·"));
      }
      console.log();
    }
  }

  console.log(divider() + "\n");
}
