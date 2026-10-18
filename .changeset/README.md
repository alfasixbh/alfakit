# Changesets

This folder is managed by [Changesets](https://github.com/changesets/changesets).

When you make a change to any `@alfakit/*` npm package, run `pnpm changeset` and describe the change. The release workflow turns accumulated changesets into version bumps, `CHANGELOG.md` entries and npm publishes.

The PHP package (`alfasix/alfakit`) is versioned by git tag and published to Packagist via the monorepo split workflow; its changes are recorded in the root `CHANGELOG.md`.
