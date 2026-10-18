# Changelog

All notable changes to `alfasix/alfakit-tree` are documented in this file.

## Unreleased

- Initial release: the `HasTreeStructure` / `ModelTree` model trait (parent, children, ancestors, root and order scopes), `TreePage` for resources, `TreeWidget`, per-node actions, `maxDepth()`, expand/collapse all, and saving a rearranged tree in one request (authorised, tenant-scoped, validated against cycles, duplicates and depth). Rendered by the `tree` component in `@alfakit/react`, `@alfakit/vue` and `@alfakit/svelte` with native drag and drop, move buttons and keyboard support.
