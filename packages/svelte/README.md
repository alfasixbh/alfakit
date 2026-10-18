# @alfakit/svelte

<p><picture><source media="(prefers-color-scheme: dark)" srcset="../../art/alfasix/alfa-six-micro-white.svg"><img src="../../art/alfasix/alfa-six-micro-navy.svg" alt="" width="24" height="18" align="top"></picture> <sub>by <a href="https://alfasixbh.com">Alfa Six</a></sub></p>

Svelte 5 renderer for AlfaKit, built on shadcn-svelte, Bits UI and Inertia.js.

AlfaKit is the frontend-agnostic admin panel builder for Laravel by [Alfa Six](https://alfasixbh.com). Panels, resources, forms, tables and actions are defined in PHP and rendered by this package.

## Install

```bash
composer require alfasix/alfakit
php artisan alfakit:install --adapter=svelte
```

The installer creates `resources/js/alfakit/app.*` and `resources/css/alfakit.css` and registers them with Vite. See the [documentation](https://alfakit.dev/docs) for custom components, pages and theming.

## License

MIT © Alfa Six
