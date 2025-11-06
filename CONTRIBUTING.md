# Contributing to jGoBoard

## Development Setup

```bash
# Install dependencies
npm install

# Start development server with hot reload
npm run dev

# Build for production
npm run build

# Lint code
npm run lint

# Format code
npm run format
```

## Release Process

To create a new release:

```bash
# 1. Make your changes and commit them
git add <files>
git commit -m "Your change description"

# 2. Bump version and create tag (choose patch/minor/major)
npm version patch -m "Release %s: Brief description"

# 3. Push commits and tags
git push && git push --tags
```

### What `npm version` does:
- Updates the version in `package.json`
- Creates a git commit with the version bump
- Creates a git tag (e.g., `v4.0.3`)

### What happens when you push the tag:
GitHub Actions will automatically:
- Build all distribution files
- Create a GitHub release
- Attach built artifacts to the release

### Version bump types:
- `patch` - Bug fixes (4.0.2 → 4.0.3)
- `minor` - New features (4.0.3 → 4.1.0)
- `major` - Breaking changes (4.0.3 → 5.0.0)

## Example Release Workflow

```bash
# Fix a bug
git add JGO/canvas.js demoPlay.html
git commit -m "Fix issue #9: Prevent illegal move popup on coordinate labels"

# Create release
npm version patch -m "Release %s: Fix coordinate label click bug"
git push && git push --tags
```

That's it! GitHub will handle the rest.
