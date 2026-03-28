# 🍌 Peely

AI-powered code reviewer for your terminal. Point it at a GitHub PR, a repository, or your local codebase and get an instant review.

## Prerequisites

- [Bun](https://bun.sh) v1.1+
- An [OpenRouter](https://openrouter.ai) API key
- A [GitHub Personal Access Token](https://github.com/settings/tokens) (only needed for GitHub URLs)

## Setup

```bash
git clone <repo-url>
cd peely
bun install
```

Create a `.env` file (or export the variables in your shell):

```bash
cp .env.example .env
```

Then fill in your keys:

```
OPENROUTER_API_KEY=sk-or-...
GITHUB_TOKEN=ghp_...
```

## Usage

```bash
# Review a GitHub pull request
bun run src/index.ts https://github.com/owner/repo/pull/123

# Review a GitHub repository
bun run src/index.ts https://github.com/owner/repo

# Review local staged/changed files
bun run src/index.ts .

# Review the entire local codebase
bun run src/index.ts . --full
```

### Options

| Flag | Description | Default |
|------|-------------|---------|
| `--full` | Scan full codebase instead of just changed files | `false` |
| `-o, --output <file>` | Export review to a markdown file | — |
| `-m, --model <name>` | OpenRouter model to use | `openai/gpt-4.1` |
| `--max-files <n>` | Maximum number of files to review | `20` |

### Examples

```bash
# Use a different model
bun run src/index.ts . -m anthropic/claude-sonnet-4

# Limit to 5 files and export a report
bun run src/index.ts https://github.com/owner/repo/pull/42 --max-files 5 -o review.md

# Review a specific branch
bun run src/index.ts https://github.com/owner/repo/tree/feature-branch
```

## Link globally (optional)

To use `peely` as a command anywhere on your system:

```bash
bun link
```

Then you can run:

```bash
peely .
peely https://github.com/owner/repo/pull/123
```

## How It Works

1. **Parse input** — detects whether you passed a PR URL, repo URL, or local path
2. **Collect code** — fetches diffs/files from GitHub API or reads local git changes
3. **Send to AI** — sends the code to the configured model via OpenRouter
4. **Display results** — shows a scored review with findings grouped by severity


## License

Apache 2.0