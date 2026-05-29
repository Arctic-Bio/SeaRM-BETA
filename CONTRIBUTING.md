# Contributing to SeaRM

Thank you for your interest in contributing to SeaRM! We welcome contributions from the community and are committed to maintaining a welcoming, inclusive environment.

## Code of Conduct

- Be respectful and inclusive
- Collaborate constructively
- Focus on the code, not the person
- Help others learn and grow

## Getting Started

### Fork & Clone

```bash
# Fork the repository on GitHub
# Clone your fork
git clone https://github.com/your-username/searm.git
cd searm

# Add upstream remote
git remote add upstream https://github.com/original-org/searm.git
```

### Development Setup

```bash
# Install dependencies
pnpm install

# Create .env.local with test database
cp .env.example .env.local

# Start development server
pnpm dev

# In another terminal, run lint/tests
pnpm run lint
```

## Making Changes

### Branch Naming

Use descriptive branch names:
```
feature/crew-lifecycle-improvements
fix/kanban-pagination-bug
docs/update-api-reference
refactor/extract-permission-logic
```

### Commit Messages

Write clear, descriptive commits:
```bash
# Good
git commit -m "Fix crew status default from new_applicant to application"
git commit -m "Add custom fields tab to crew detail page"

# Avoid
git commit -m "fix bug"
git commit -m "update stuff"
```

### Code Style

- Use TypeScript for all new code
- Follow existing patterns in the codebase
- Use `const` by default, `let` when needed
- Format with consistent indentation (2 spaces)
- Use semicolons consistently
- Use descriptive variable names

### Testing

For UI changes:
- Test on desktop and mobile
- Verify responsive layout
- Check keyboard navigation
- Test with screen readers (accessibility)

For API changes:
- Test with curl or Postman
- Verify auth checks work properly
- Test error cases and edge cases
- Verify database changes are transactional

### Documentation

- Update README.md if adding features
- Add JSDoc comments for new functions
- Document API endpoints
- Update DEPLOYMENT.md if adding env vars or breaking changes

## Pull Request Process

### Before Submitting

1. **Sync with main branch**
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Verify your changes compile**
   ```bash
   pnpm run build
   ```

3. **Lint your code**
   ```bash
   pnpm run lint
   ```

4. **Test locally**
   ```bash
   pnpm dev
   # Visit http://localhost:3000 and test your feature
   ```

### Pull Request Template

```markdown
## Description
Brief description of what this PR does.

## Related Issues
Fixes #123

## Type of Change
- [ ] Bug fix (non-breaking)
- [ ] New feature (non-breaking)
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Desktop tested
- [ ] Mobile tested
- [ ] API tested
- [ ] Auth/permissions verified

## Checklist
- [ ] Code follows project style guidelines
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] No console.log statements left
- [ ] All TypeScript errors resolved
```

### What We Look For

✅ **Clear description** of the change and why it's needed  
✅ **Tests** demonstrating the fix or feature works  
✅ **Documentation** updated accordingly  
✅ **Code quality** following project patterns  
✅ **TypeScript compliance** with no type errors  
✅ **Accessibility** considerations for UI changes  
✅ **Security** implications considered  

❌ **Avoid:**
- Large refactors in the same PR as features
- Changing unrelated code
- Removing features without discussion
- Breaking API changes without discussion

## Architecture Guidelines

### File Organization

- **Components**: One component per file in `components/`
- **API Routes**: Organized by domain in `app/api/`
- **Database**: Schema definitions in `lib/db.ts`
- **Utilities**: Shared logic in `lib/utils.ts` or domain-specific `lib/*/`
- **Types**: Define types in the file using them or in `lib/types.ts`

### Database Changes

When modifying the database schema:

1. Document the change in migration comments
2. Include the SQL migration script
3. Update `lib/db.ts` type definitions
4. Update related API routes
5. Update README.md if adding new features

### API Changes

When adding or modifying API endpoints:

1. Use `requireApiAuth()` for authentication checks
2. Add appropriate permission checks (e.g., `{ staffOnly: true }`)
3. Document the endpoint in README.md
4. Use consistent response format: `{ data: ... }` or `{ error: ... }`
5. Return proper HTTP status codes (200, 400, 401, 403, 404, 500)

### Component Changes

- Keep components focused and single-responsibility
- Use TypeScript props interfaces
- Add JSDoc comments for complex components
- Use SWR for data fetching
- Keep styles in Tailwind classes
- Test responsive behavior

## Reporting Issues

### Bug Reports

Include:
- Clear description of the bug
- Steps to reproduce
- Expected vs. actual behavior
- Browser/OS information
- Screenshots if applicable

### Feature Requests

Include:
- Clear description of the feature
- Use case and why it's needed
- Any design sketches or mockups
- Related issues or discussions

## Performance & Optimization

Before submitting PRs:

- Verify database queries use indexes
- Check for n+1 queries
- Use SWR caching appropriately
- Avoid unnecessary re-renders
- Test with realistic data volumes
- Check bundle size impact (if applicable)

## Security Considerations

- Always validate user inputs
- Use parameterized queries (never string interpolation)
- Enforce authentication and authorization
- Sanitize output for XSS prevention
- Use HTTPS in production
- Don't commit secrets or credentials
- Report security issues privately to maintainers

## Documentation

### README Updates

Update README.md if your PR:
- Adds a new feature
- Changes user-facing behavior
- Adds new environment variables
- Modifies installation/setup

### Code Comments

Add comments for:
- Complex algorithms or logic
- Non-obvious design decisions
- Workarounds or hacks (mark as TODO to fix)
- Business logic rationale

## Release Process

Maintainers will:
1. Review and test your PR
2. Request changes if needed
3. Merge to main branch
4. Include in next release notes
5. Tag and release new version

## Questions?

- 📖 Check [README.md](README.md) for docs
- 💬 Open a discussion on GitHub
- 📧 Email maintainers for security issues

---

**Thank you for contributing to SeaRM!** ⚓
