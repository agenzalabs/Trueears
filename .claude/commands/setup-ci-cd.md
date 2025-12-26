---
description: Implement pre-commit hooks and GitHub Actions for quality assurance
allowed-tools: Bash(*), Read, Write, Glob, Grep
argument-hint: [optional: language or framework]
---

# Setup CI/CD Pipeline

Implement comprehensive DevOps quality gates adapted to project type:

## 1. Analyze Project
Detect language(s), framework, build system, and existing tooling:
- Check `package.json`, `Cargo.toml`, `pyproject.toml`, `go.mod`, etc.
- Identify existing linters, formatters, test frameworks
- Note any existing CI/CD configurations

## 2. Configure Pre-commit Hooks

Install and configure with language-specific tools:

### Formatting
- **JavaScript/TypeScript**: Prettier
- **Python**: Black, isort
- **Go**: gofmt
- **Rust**: rustfmt

### Linting
- **JavaScript/TypeScript**: ESLint
- **Python**: Ruff, flake8
- **Go**: golangci-lint
- **Rust**: Clippy

### Security
- **JavaScript**: npm audit
- **Python**: Bandit, safety
- **Go**: gosec
- **Rust**: cargo-audit

### Type Checking (if applicable)
- TypeScript: tsc --noEmit
- Python: mypy
- Flow

### Tests
- Run relevant test suites on commit

## 3. Create GitHub Actions Workflows

Create `.github/workflows/` with:

### CI Workflow (`ci.yml`)
- Trigger on push and PR to main branches
- Mirror pre-commit checks
- Multi-version/platform matrix (if applicable)
- Build and test verification
- Cache dependencies for speed

### Optional Workflows
- `release.yml` - Deployment steps (if needed)
- `security.yml` - Security scanning
- `docs.yml` - Documentation builds

## 4. Verify Pipeline

- Test pre-commit hooks locally
- Create test commit to verify hooks work
- Confirm all GitHub Actions checks pass

## Guidelines

- Use free/open-source tools only
- Respect existing configurations
- Keep execution fast (< 2 min for pre-commit)
- Add clear error messages
- Document any manual setup steps required
