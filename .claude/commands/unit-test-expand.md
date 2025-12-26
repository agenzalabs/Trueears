---
description: Increase test coverage by targeting untested branches and edge cases
allowed-tools: Bash(*), Read, Write, Glob, Grep
argument-hint: [optional: file or directory to focus on]
---

# Expand Unit Tests

Expand existing unit tests adapted to project's testing framework:

## 1. Analyze Coverage

Run coverage report to identify:
- Untested branches
- Edge cases
- Low-coverage areas
- Uncovered functions/methods

```bash
# JavaScript/TypeScript
npm test -- --coverage

# Python
pytest --cov --cov-report=term-missing

# Go
go test -cover ./...

# Rust
cargo tarpaulin
```

## 2. Identify Gaps

Review code for:
- Logical branches (if/else, switch cases)
- Error paths and exception handling
- Boundary conditions (min/max values)
- Null/empty/undefined inputs
- State transitions and side effects
- Race conditions (async code)

## 3. Write Tests

Use project's existing framework:

| Language | Frameworks |
|----------|------------|
| JavaScript/TypeScript | Jest, Vitest, Mocha |
| Python | pytest, unittest |
| Go | testing, testify |
| Rust | built-in test framework |

## 4. Target Specific Scenarios

### Error Handling
- Invalid inputs
- Network failures
- Timeout scenarios
- Permission errors

### Boundary Values
- Empty arrays/strings
- Zero, negative numbers
- Maximum/minimum values
- Off-by-one cases

### Edge Cases
- Concurrent operations
- Unicode/special characters
- Large datasets
- Malformed data

### State Transitions
- Initial state
- Intermediate states
- Final state
- Invalid state transitions

## 5. Verify Improvement

Run coverage again and confirm:
- Measurable coverage increase
- All new tests pass
- No regressions introduced

## Output

Present new test code blocks only. Follow:
- Existing test patterns and naming conventions
- Arrange-Act-Assert structure
- Clear test descriptions
- Isolated, independent tests
