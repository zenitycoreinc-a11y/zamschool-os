# Contributing to ZamSchool OS

Thank you for your interest in contributing to ZamSchool OS! This document provides guidelines and instructions for contributing to the project.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)
- [Issue Reporting](#issue-reporting)

## Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Collaborate openly and transparently

## Getting Started

### Prerequisites

- Node.js 20+
- npm or yarn
- Git
- Supabase account
- MongoDB instance (optional)
- Redis instance (optional)

### Setup

1. **Fork the repository**
   ```bash
   git clone https://github.com/your-username/zamschool-os.git
   cd zamschool-os
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your credentials
   ```

4. **Run database migrations**
   - Apply migrations through Supabase dashboard or CLI

5. **Start development server**
   ```bash
   npm run dev
   ```

## Development Workflow

### Branch Naming Convention

Use descriptive branch names following this pattern:
- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation updates
- `refactor/description` - Code refactoring
- `test/description` - Test additions or updates
- `chore/description` - Maintenance tasks

Examples:
```bash
git checkout -b feature/student-attendance-export
git checkout -b fix/teacher-dashboard-loading
git checkout -b docs/api-documentation
```

### Commit Messages

Write clear and concise commit messages:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, semicolons, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Example:**
```
feat(attendance): add bulk import for attendance records

- Implement CSV upload for daily attendance
- Add validation for student admission numbers
- Show summary after successful import

Closes #123
```

## Coding Standards

### TypeScript

- Use TypeScript for all new code
- Define proper types for all functions and components
- Avoid using `any` type; use `unknown` if necessary
- Export types and interfaces from dedicated type files

### React Components

- Use functional components with hooks
- Keep components small and focused
- Extract reusable logic into custom hooks
- Use proper prop typing

```typescript
interface StudentCardProps {
  student: Student;
  onViewDetails: (id: string) => void;
}

export function StudentCard({ student, onViewDetails }: StudentCardProps) {
  // Component implementation
}
```

### Styling

- Use TailwindCSS for styling
- Follow mobile-first approach
- Use consistent spacing and color values
- Prefer utility classes over custom CSS

### File Organization

```
lib/
├── utils/           # Utility functions
├── services/        # API and external services
├── hooks/           # Custom React hooks
└── types/           # TypeScript type definitions

components/
├── ui/              # Reusable UI components
├── forms/           # Form components
├── layouts/         # Layout components
└── features/        # Feature-specific components
```

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run library tests only
npm run test:lib

# Run root level tests only
npm run test:root
```

### Writing Tests

- Write tests for all new features
- Maintain or improve code coverage
- Use descriptive test names
- Test edge cases and error conditions

```typescript
import { describe, it, before } from 'node:test';
import assert from 'node:assert';

describe('AttendanceService', () => {
  describe('markAttendance', () => {
    it('should mark student as present', async () => {
      // Test implementation
    });

    it('should throw error for invalid student ID', async () => {
      // Test implementation
    });
  });
});
```

### Test File Naming

- Place test files next to the files they test
- Use `.test.mjs` extension for test files
- Example: `attendance-service.ts` → `attendance-service.test.mjs`

## Pull Request Process

### Before Submitting

1. **Update documentation** if needed
2. **Add or update tests** for your changes
3. **Run the test suite** and ensure all tests pass
4. **Check code formatting** with linter
5. **Review your changes** for any debugging code

### PR Template

When creating a pull request, include:

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tests added/updated
- [ ] All tests pass
- [ ] Manual testing completed

## Screenshots (if applicable)

## Checklist
- [ ] Code follows project guidelines
- [ ] Self-review completed
- [ ] Comments added where necessary
- [ ] Documentation updated
```

### Review Process

1. Create pull request to `main` branch
2. Automated checks will run
3. At least one maintainer review required
4. Address review comments
5. Squash commits if necessary
6. Merge when approved

## Issue Reporting

### Bug Reports

Include the following information:

- **Description**: Clear description of the bug
- **Steps to Reproduce**: Detailed steps to reproduce
- **Expected Behavior**: What should happen
- **Actual Behavior**: What actually happens
- **Environment**: 
  - Node.js version
  - Browser (if applicable)
  - OS
- **Screenshots**: If applicable
- **Logs**: Error messages or stack traces

### Feature Requests

- **Problem Statement**: What problem does this solve?
- **Proposed Solution**: How should it work?
- **Use Cases**: Who will benefit from this?
- **Alternatives Considered**: Other solutions thought about

## Database Migrations

When modifying the database schema:

1. Create a new migration file in `migrations/`
2. Use descriptive naming: `YYYYMMDD_description.sql`
3. Include both up and down migrations
4. Test migration on development database
5. Document changes in migration file comments

## Security

- Never commit sensitive data (API keys, passwords)
- Use environment variables for secrets
- Follow security best practices
- Report security vulnerabilities privately

## Questions?

If you have questions, please:
1. Check existing documentation
2. Search closed issues
3. Ask in discussions or issues

Thank you for contributing to ZamSchool OS! 🎉
