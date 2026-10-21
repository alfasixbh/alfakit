### Benchmark results (2026-10-21, label `m5-0.1.6`)

|  |  |
| --- | --- |
| CPU | Apple M5 (Mac17,2) |
| Cores | 10 (4 performance + 6 efficiency) |
| Memory | 16 GB |
| Operating system | macOS 27.0 (26A428) (arm64) |
| PHP (CLI) | 8.4.23 |
| Node | v22.23.0 |
| Browser | Chrome 155.0.8059.85 (headless, 1440×900, Playwright) |
| AlfaKit (React) server | PHP 8.4.23 (fpm-fcgi, OPcache on), Laravel 13.35.0, APP_DEBUG false, config and route cache on, sqlite, Inertia SSR off; alfasix/alfakit dev-main, inertiajs/inertia-laravel v3.5.1 |
| AlfaKit (Vue) server | PHP 8.4.23 (fpm-fcgi, OPcache on), Laravel 13.35.0, APP_DEBUG false, config and route cache on, sqlite, Inertia SSR off; alfasix/alfakit dev-main, inertiajs/inertia-laravel v3.5.1 |
| AlfaKit (Svelte) server | PHP 8.4.23 (fpm-fcgi, OPcache on), Laravel 13.35.0, APP_DEBUG false, config and route cache on, sqlite, Inertia SSR off; alfasix/alfakit dev-main, inertiajs/inertia-laravel v3.5.1 |
| Filament v5 server | PHP 8.4.23 (fpm-fcgi, OPcache on), Laravel 13.35.0, APP_DEBUG false, config and route cache on, sqlite; filament/filament v5.10.1, livewire/livewire v4.4.7 |
| Method | 2 warm-up + 7 measured runs per scenario, medians; 2026-10-21 |
| Load average (1/5/15 min) | 2.93 / 3.14 / 3.26 at the start, 2.42 / 3.11 / 3.26 at the end |

#### Server: full page (median time to first byte, HTML size uncompressed / gzip)

| Scenario | AlfaKit (React) | AlfaKit (Vue) | AlfaKit (Svelte) | Filament v5 |
| --- | --- | --- | --- | --- |
| Table, 50 rows, with filters | 29 ms, 105.4 KB / 22.0 KB | 28 ms, 101.8 KB / 21.6 KB | 30 ms, 105.6 KB / 22.0 KB | 72 ms, 1.46 MB / 44.7 KB |
| Table, 500 rows, with filters | 145 ms, 501.6 KB / 54.2 KB | 128 ms, 496.2 KB / 53.8 KB | 130 ms, 502.7 KB / 54.3 KB | 382 ms, 13.41 MB / 281.0 KB |
| Form, 100 fields + repeater | 19 ms, 89.1 KB / 22.5 KB | 18 ms, 85.6 KB / 22.2 KB | 20 ms, 89.1 KB / 22.6 KB | 35 ms, 516.5 KB / 23.1 KB |
| Dashboard, 6 widgets | 16 ms, 60.2 KB / 16.8 KB | 15 ms, 56.7 KB / 16.5 KB | 17 ms, 60.3 KB / 16.9 KB | 19 ms, 66.2 KB / 10.9 KB |
| Global search | 20 ms, 70.4 KB / 18.6 KB | 19 ms, 66.9 KB / 18.3 KB | 23 ms, 70.5 KB / 18.6 KB | 35 ms, 409.4 KB / 23.2 KB |

#### Server: the request behind the interaction (median response time, response size)

| Scenario | AlfaKit (React) | AlfaKit (Vue) | AlfaKit (Svelte) | Filament v5 |
| --- | --- | --- | --- | --- |
| Table, 50 rows, with filters: sort by name | 24 ms, 47.9 KB | 24 ms, 47.7 KB | 24 ms, 48.0 KB | 74 ms, 1.46 MB |
| Table, 500 rows, with filters: sort by name | 132 ms, 445.8 KB | 132 ms, 443.9 KB | 133 ms, 446.8 KB | 459 ms, 13.75 MB |
| Form, 100 fields + repeater: `live()` field round trip | 14 ms, 4.6 KB | 14 ms, 4.6 KB | 13 ms, 4.6 KB | 32 ms, 486.8 KB |
| Dashboard, 6 widgets: widget data | 20 ms, 6.4 KB | 20 ms, 6.4 KB | 20 ms, 6.4 KB | n/a |
| Global search: type a SKU until results show | 51 ms, 0.2 KB | 51 ms, 0.2 KB | 51 ms, 0.2 KB | 50 ms, 7.1 KB |

#### Browser: page load (median time to interactive; total blocking time; DOM nodes)

| Scenario | AlfaKit (React) | AlfaKit (Vue) | AlfaKit (Svelte) | Filament v5 |
| --- | --- | --- | --- | --- |
| Table, 50 rows, with filters | 196 ms; TBT 0 ms; 4,719 nodes | 228 ms; TBT 0 ms; 4,711 nodes | 278 ms; TBT 0 ms; 4,839 nodes | 279 ms; TBT 30 ms; 3,510 nodes |
| Table, 500 rows, with filters | 290 ms; TBT 0 ms; 1,771 nodes | 285 ms; TBT 0 ms; 1,763 nodes | 324 ms; TBT 0 ms; 1,815 nodes | 2645 ms; TBT 1304 ms; 31,500 nodes |
| Form, 100 fields + repeater | 174 ms; TBT 0 ms; 2,335 nodes | 208 ms; TBT 0 ms; 2,348 nodes | 215 ms; TBT 0 ms; 2,221 nodes | 164 ms; TBT 0 ms; 2,068 nodes |
| Dashboard, 6 widgets | 192 ms; TBT 0 ms; 1,076 nodes | 198 ms; TBT 0 ms; 1,073 nodes | 218 ms; TBT 0 ms; 1,094 nodes | 151 ms; TBT 0 ms; 496 nodes |
| Global search | 123 ms; TBT 0 ms; 1,613 nodes | 135 ms; TBT 0 ms; 1,605 nodes | 162 ms; TBT 0 ms; 1,653 nodes | 114 ms; TBT 0 ms; 1,022 nodes |

#### Browser: interaction latency (median, from the input until the result is painted)

| Scenario | AlfaKit (React) | AlfaKit (Vue) | AlfaKit (Svelte) | Filament v5 |
| --- | --- | --- | --- | --- |
| Table, 50 rows, with filters: sort by name | 118 ms | 134 ms | 148 ms | 253 ms |
| Table, 500 rows, with filters: sort by name | 239 ms | 229 ms | 233 ms | 2380 ms |
| Form, 100 fields + repeater: `live()` field round trip | 227 ms | 225 ms | 226 ms | 287 ms |
| Global search: type a SKU until results show | 371 ms | 371 ms | 351 ms | 646 ms |

Notes: Server times are measured over loopback with one sequential client (TTFB for pages, full response time for interaction requests). Time to interactive is when the page is usable (rows rendered, 100 fields mounted, all six widgets loaded, including the deferred widget data) and the main thread has been free of long tasks for 500 ms. Interaction latency is timed from the Playwright input until the change is painted and includes each stack’s default debounce: AlfaKit debounces typed `live()` fields by 150 ms (choices such as selects and toggles refresh at once) and global search by 250 ms; Filament’s global search field debounces by 500 ms and its `live()` fields use Livewire’s `wire:model.live` default. AlfaKit table rows and repeater items are virtualised, so the DOM holds the visible window of a 500-row table.
