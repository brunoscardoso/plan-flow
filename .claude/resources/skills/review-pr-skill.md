
# Review PR Skill

## Purpose

Perform a comprehensive **read-only analysis** of a Pull Request using established patterns and guidelines, then generate a structured review document.

This skill **only produces a markdown file** with findings. It does NOT:

- Run any build or test commands
- Modify any code
- Execute any scripts
- Make changes to the codebase

---

## Restrictions - READ ONLY

This skill is **strictly read-only analysis**. The review process:

1. **Reads** the PR diff and files
2. **Analyzes** against patterns and guidelines
3. **Generates** a markdown file with findings

**No code execution, no code modification, no builds.**

### NEVER Do These Actions

| Forbidden Action                         | Reason                                         |
| ---------------------------------------- | ---------------------------------------------- |
| `npm run build`                          | No build commands - analysis only              |
| `npm run test`                           | No test commands - analysis only               |
| `npm install`                            | No dependency installation                     |
| Edit/modify any source code              | No code changes - review produces findings     |
| Create/edit files outside `flow/`    | Only write to `flow/reviewed-pr/`          |
| `git commit`                             | No commits to any repository                   |
| `git push`                               | No pushing to remote repositories              |
| `git checkout`                           | No branch switching on external repos          |
| `gh pr merge`                            | No merging pull requests                       |
| `gh pr close`                            | No closing pull requests                       |
| `gh pr review --approve`                 | No approving PRs directly via CLI              |
| `gh pr review --request-changes`         | No requesting changes directly via CLI         |
| `gh pr comment`                          | No posting comments directly to the PR         |
| Any write operation to the external repo | All output goes to local markdown only         |
| Any shell command that modifies code     | This is a read-only analysis, not an execution |

### Allowed Actions

#### GitHub Commands

| Allowed Action               | Purpose                                      |
| ---------------------------- | -------------------------------------------- |
| `gh auth status`             | Check authentication status                  |
| `gh auth login --with-token` | Authenticate using PAT from `.plan.flow.env` |
| `gh pr view`                 | Read PR information                          |
| `gh pr diff`                 | Read PR diff/changes                         |
| `gh pr files`                | List files changed in PR                     |
| `gh api` (GET requests only) | Fetch additional PR data                     |

#### Azure DevOps Commands

| Allowed Action                                        | Purpose                                 |
| ----------------------------------------------------- | --------------------------------------- |
| `az devops configure`                                 | Configure Azure DevOps defaults         |
| `az devops invoke --area git --resource pullRequests` | Fetch PR details                        |
| `az devops invoke --area git --resource blobs`        | Fetch file contents                     |
| `az devops invoke --area git --resource diffs`        | Fetch PR diff                           |
| `az devops invoke --area git --resource commits`      | Fetch commit information                |
| `az repos pr show`                                    | Show PR details                         |
| `az repos pr list`                                    | List PRs (for finding existing reviews) |
| `curl` with GET + PAT auth                            | Direct API calls to Azure DevOps        |

#### Local Operations

| Allowed Action                   | Purpose                               |
| -------------------------------- | ------------------------------------- |
| Write to `flow/reviewed-pr/` | Save review notes locally             |
| Write to `/tmp/`                 | Temporary file storage for processing |
| Read project rule files          | Load patterns for analysis            |
| `source .plan.flow.env`          | Load environment credentials          |

> **Important**: The ONLY writable location is `flow/reviewed-pr/`. No source code, configuration files, or any other project files should be modified.

### Allowed Command Examples

```bash
# Fetch file content from Azure DevOps
az devops invoke \
  --area git \
  --resource blobs \
  --route-parameters project={project} repositoryId={repo} sha1={sha} \
  --query-parameters '$format=text' \
  --api-version 7.0 \
  --out-file /tmp/{filename} \
  && cat /tmp/{filename}

# Fetch PR details from Azure DevOps
az devops invoke \
  --area git \
  --resource pullRequests \
  --route-parameters project={project} repositoryId={repo} pullRequestId={pr_id} \
  --api-version 7.0

# Fetch PR diff/changes
az devops invoke \
  --area git \
  --resource diffs \
  --route-parameters project={project} repositoryId={repo} \
  --query-parameters 'baseVersion={base}&targetVersion={target}' \
  --api-version 7.0

# Direct API call with PAT
curl -s -u ":$AZURE_DEVOPS_PAT" \
  "https://dev.azure.com/{org}/{project}/_apis/git/pullrequests/{pr_id}?api-version=7.0"
```

> **Output**: All findings, comments, and suggestions are saved to a local markdown file in `flow/reviewed-pr/`. The user can then manually copy comments to the PR if desired.

---

## Inputs

| Input      | Required | Description                                      |
| ---------- | -------- | ------------------------------------------------ |
| `pr_link`  | Yes      | The URL of the Pull Request to review            |
| `language` | Optional | Primary language (auto-detected if not provided) |

---

## Workflow

### Step 0: Authenticate for PR Access

Use the **[PR Authentication Tool](../tools/auth-pr-tool.md)** to authenticate and verify access to the PR.

**What the tool does**:

1. Detects platform from PR URL (GitHub or Azure DevOps)
2. Loads credentials from `.plan.flow.env`
3. Authenticates using the appropriate method for the platform
4. Verifies access by fetching the PR

**Usage**:

```markdown
Use the auth-pr tool with the PR URL: {pr_link}

The tool will:
- Detect platform (GitHub/Azure DevOps)
- Load credentials from .plan.flow.env
- Authenticate and verify access
- Return authentication status
```

After successful authentication, proceed to fetch PR information.

---

### Step 1: Fetch PR Information

1. Use the provided PR link to fetch the Pull Request details
2. Extract the PR title, description, and list of changed files
3. Identify the primary language(s) used in the PR

### Step 2: Load Review Patterns

1. Read `.claude/resources/patterns/review-pr-patterns.md` for general review guidelines
2. Based on the detected language(s), load the appropriate pattern file:
   - **TypeScript/JavaScript**: Load `.claude/resources/languages/typescript-patterns.md`
   - **Python**: Load `.claude/resources/languages/python-patterns.md`
3. Cross-reference with `.claude/rules/core/forbidden-patterns.md` for anti-patterns to flag
4. Cross-reference with `.claude/rules/core/allowed-patterns.md` for best practices to encourage
5. Use the [`complexity-scoring` pattern](../core/complexity-scoring.md) for fix complexity scoring

### Step 3: Analyze Code Changes

For each file in the PR:

1. Review the diff/changes
2. Check for violations of forbidden patterns
3. Verify adherence to allowed patterns
4. Apply language-specific checks
5. Identify security, performance, and maintainability concerns

### Step 4: Generate or Update Review Document

**Check for existing review file** in `flow/reviewed-pr/` before creating a new one.

#### If reviewing the same PR again:

1. **Find the existing file** matching the PR (by PR number or title)
2. **Update the existing file** with the new review findings
3. **Add a review history entry** showing when each review was performed
4. **Mark resolved findings** from previous reviews if they've been fixed
5. **Add new findings** discovered in the updated PR

#### If this is a new PR:

Create a markdown file in `flow/reviewed-pr/` with the naming convention:

```
pr-notes-{sanitized-pr-title}.md
```

**Example**: For a PR titled "Add user authentication flow", create:

```
flow/reviewed-pr/pr-notes-add-user-authentication-flow.md
```

> **Tip**: Use the PR number in the filename for easier matching on re-reviews (e.g., `pr-notes-123-add-user-authentication-flow.md`)

---

## Output Format

The generated review document should follow this structure:

```markdown
# PR Review: {PR Title}

## PR Information

| Field       | Value                |
| ----------- | -------------------- |
| PR Link     | {pr_link}            |
| PR Number   | {pr_number}          |
| PR Title    | {pr_title}           |
| Author      | {author}             |
| Branch      | {branch}             |
| Files       | {number_of_files}    |
| Language(s) | {detected_languages} |

---

## Review History

| Review # | Date           | Findings | Resolved | New   |
| -------- | -------------- | -------- | -------- | ----- |
| 1        | {initial_date} | {count}  | -        | -     |
| 2        | {update_date}  | {count}  | {fixed}  | {new} |

> Update this table each time the PR is re-reviewed.

---

## Review Summary

| Metric               | Value              |
| -------------------- | ------------------ |
| **Total Findings**   | {count}            |
| Critical             | {critical_count}   |
| Major                | {major_count}      |
| Minor                | {minor_count}      |
| Suggestion           | {suggestion_count} |
| **Total Fix Effort** | {sum_of_scores}/X  |

> **Total Fix Effort**: Sum of all fix complexity scores. Use this to estimate the overall effort needed to address all findings.

---

## Findings

### Finding 1: {Finding Name}

| Field          | Value                                              |
| -------------- | -------------------------------------------------- |
| File           | `{file_path}`                                      |
| Line           | {line_number}                                      |
| **Link**       | **[View in PR]({direct_url_to_line})** REQUIRED    |
| Severity       | {Critical | Major | Minor | Suggestion}            |
| Fix Complexity | {X/10} - {Level}                                   |
| Status         | {Open | Resolved}                                  |
| Pattern        | {Reference to pattern from rules, if applicable}   |

> **Important**: The Link field is REQUIRED. Always include a clickable link to the exact line in the PR.
> **Fix Complexity**: Use the [`complexity-scoring` pattern](../core/complexity-scoring.md) to calculate the effort required to fix this finding.

**Description**:
{Detailed explanation of the issue found}

**PR Comment** (for manual use):

> {Short, polished message ready to copy/paste into the PR comment section}

**Suggested Fix**:
\`\`\`{language}
// Suggested code improvement
\`\`\`

---

### Finding 2: {Finding Name}

... (repeat structure for each finding)

---

## Positive Highlights

List any particularly well-written code or good practices observed:

- {Highlight 1}
- {Highlight 2}

---

## Approval Recommendation

| Status | {Approve | Request Changes | Needs Discussion} |
| ------ | ------------------------------------------------ |
| Reason | {Brief explanation of the recommendation}        |
```

---

## Severity Levels

| Level      | Description                                              |
| ---------- | -------------------------------------------------------- |
| Critical   | Security vulnerabilities, data loss risks, blocking bugs |
| Major      | Significant issues affecting functionality or quality    |
| Minor      | Code style, minor improvements, non-critical concerns    |
| Suggestion | Nice-to-have improvements, optional enhancements         |

---

## Fix Complexity Scoring

Use the [`complexity-scoring` pattern](../core/complexity-scoring.md) to calculate the effort required to fix each finding. This helps prioritize which issues to address first.

### Complexity Scale

| Score | Level     | Description                      | Example Fix                                    |
| ----- | --------- | -------------------------------- | ---------------------------------------------- |
| 0-2   | Trivial   | Simple, quick fix                | Adding a missing import, renaming a variable   |
| 3-4   | Low       | Straightforward fix              | Adding error logging, fixing a type annotation |
| 5-6   | Medium    | Moderate effort, some decisions  | Refactoring a function, adding validation      |
| 7-8   | High      | Complex fix, multiple files      | Restructuring state management, adding tests   |
| 9-10  | Very High | Significant refactoring required | Architecture changes, multi-file refactoring   |

### Scoring Modifiers

Apply these modifiers to calculate the fix complexity:

| Modifier                              | Points |
| ------------------------------------- | ------ |
| Each file that needs to be modified   | +1     |
| Requires adding new tests             | +1     |
| Involves state management changes     | +1     |
| Requires API/interface changes        | +1     |
| Simple code addition (no refactoring) | -1     |
| Fix follows existing pattern exactly  | -1     |

### Example Calculations

| Finding                          | Calculation                           | Score |
| -------------------------------- | ------------------------------------- | ----- |
| Missing error logging            | 1 file, simple addition = 2 - 1       | 1/10  |
| Type annotation fix              | 1 file, follows pattern = 1 - 1       | 0/10  |
| Add input validation with Zod    | 1 file + new schema = 2 + 1           | 3/10  |
| Refactor to view/logic split     | 2 files + pattern + state = 2 + 1 + 1 | 4/10  |
| Fix silent error swallowing      | 1 file + error handling = 1 + 2       | 3/10  |
| Add comprehensive error handling | Multiple files + tests = 3 + 1 + 2    | 6/10  |

---

## Link Format

Generate direct links to the specific line in the PR. The format depends on the platform:

### GitHub

**For branch blob view (preferred)**:

```
https://github.com/{owner}/{repo}/blob/{branch_name}/{file_path}#L{line_number}
```

**For PR file view**:

```
https://github.com/{owner}/{repo}/pull/{pr_number}/files#diff-{file_path_hash}R{line_number}
```

### Azure DevOps

**For PR file view with line (CORRECT FORMAT)**:

```
https://dev.azure.com/{org}/{project}/_git/{repo}/pullrequest/{pr_id}?_a=files&path={file_path}&line={line_number}&lineEnd={line_number}&lineStartColumn=1&lineEndColumn=1000&lineStyle=plain
```

> **Critical Parameters**:
>
> - `_a=files` - Required to navigate to the Files tab
> - `lineStyle=plain` - Ensures line highlighting works
> - `lineEndColumn=1000` - Use a large number to highlight the full line

**For branch file view (alternative)**:

```
https://dev.azure.com/{org}/{project}/_git/{repo}?path={file_path}&version=GB{branch_name}&line={line_number}&lineEnd={line_number}&lineStartColumn=1&lineEndColumn=1000&lineStyle=plain&_a=contents
```

### Examples

| Platform     | Type      | URL Example                                                                                                                                                           |
| ------------ | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GitHub       | Blob View | `https://github.com/acme/webapp/blob/feature-auth/src/services/userService.ts#L45`                                                                                    |
| GitHub       | PR Files  | `https://github.com/acme/webapp/pull/123/files#diff-abc123R45`                                                                                                        |
| Azure DevOps | PR Files  | `https://dev.azure.com/org/project/_git/repo/pullrequest/123?_a=files&path=/src/api/route.ts&line=45&lineEnd=45&lineStartColumn=1&lineEndColumn=1000&lineStyle=plain` |
| Azure DevOps | Branch    | `https://dev.azure.com/org/project/_git/repo?path=/src/api/route.ts&version=GBfeature-branch&line=45&lineEnd=45&_a=contents`                                          |

> **REQUIRED**: Every finding MUST include a clickable link. This allows reviewers to quickly navigate to the exact location of the issue.

---

## Example Finding

### Finding 1: Silent Error Swallowing

| Field          | Value                                                                                             |
| -------------- | ------------------------------------------------------------------------------------------------- |
| File           | `src/services/userService.ts`                                                                     |
| Line           | 45                                                                                                |
| **Link**       | **[View in PR](https://github.com/org/repo/blob/feature-branch/src/services/userService.ts#L45)** |
| Severity       | Major                                                                                             |
| Fix Complexity | 3/10 - Low                                                                                        |
| Status         | Open                                                                                              |
| Pattern        | `forbidden-patterns.md` - DON'T Swallow Errors                                                    |

> **Azure DevOps example link**: `[View in PR](https://dev.azure.com/org/project/_git/repo/pullrequest/123?_a=files&path=/src/services/userService.ts&line=45&lineEnd=45&lineStartColumn=1&lineEndColumn=1000&lineStyle=plain)`

**Description**:
The catch block on line 45 catches an error but does not log it or provide user feedback. This makes debugging production issues extremely difficult and leaves users unaware that their action failed.

**PR Comment** (for manual use):

> This error is being caught but not logged or handled. Consider adding proper error logging and user feedback. See our team guidelines in `forbidden-patterns.md` for error handling best practices.

**Suggested Fix**:

```typescript
try {
  await saveUserData(userData);
} catch (error) {
  logger.error("Failed to save user data", { error, userId: userData.id });
  throw new UserFacingError("Unable to save your changes. Please try again.");
}
```

---

## Quick Reference Commands

```bash
# Review a GitHub PR
review-pr https://github.com/org/repo/pull/123

# Review with explicit language
review-pr https://github.com/org/repo/pull/123 --language typescript
```

---

## Related Files

| File                                       | Purpose                              |
| ------------------------------------------ | ------------------------------------ |
| `.claude/resources/patterns/review-pr-patterns.md` | Main review checklist and guidelines |
| `.claude/rules/core/forbidden-patterns.md`  | Anti-patterns to flag                |
| `.claude/rules/core/allowed-patterns.md`    | Best practices to encourage          |
| `.claude/resources/languages/typescript-patterns.md` | TypeScript-specific checks           |
| `.claude/resources/languages/python-patterns.md` | Python-specific checks               |
| `.claude/rules/core/complexity-scoring.md`  | Fix complexity scoring system        |
| `.claude/resources/tools/auth-pr-tool.md`   | PR authentication tool               |
| `flow/reviewed-pr/`                        | Output folder for review documents   |
| `.plan.flow.env`                           | Authentication tokens (gitignored)   |
| `.example.plan.flow.env`                   | Example env file template            |

---

## Authentication

Authentication is handled by the **[PR Authentication Tool](../tools/auth-pr-tool.md)**. See that tool for:

- Credential configuration
- Platform detection
- Authentication methods
- Error handling
- Security notes
