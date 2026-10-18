### Benchmark results (2026-10-18, label `local`)

|  |  |
| --- | --- |
| CPU | Apple M5 (Mac17,2) |
| Cores | 10 (4 performance + 6 efficiency) |
| Memory | 16 GB |
| Operating system | macOS 27.0 (26A428) (arm64) |
| PHP (CLI) | 8.4.23 |
| Node | v22.23.0 |
| Browser | Chrome 155.0.8059.84 (headless, 1440×900, Playwright) |
| AlfaKit (React) server | PHP 8.4.23 (fpm-fcgi, OPcache on), Laravel 13.35.0, APP_DEBUG false, config cache off, sqlite, Inertia SSR off; alfasix/alfakit dev-main, inertiajs/inertia-laravel v3.5.1 |
| AlfaKit (Vue) server | PHP 8.4.23 (fpm-fcgi, OPcache on), Laravel 13.35.0, APP_DEBUG false, config cache off, sqlite, Inertia SSR off; alfasix/alfakit dev-main, inertiajs/inertia-laravel v3.5.1 |
| AlfaKit (Svelte) server | PHP 8.4.23 (fpm-fcgi, OPcache on), Laravel 13.35.0, APP_DEBUG false, config cache off, sqlite, Inertia SSR off; alfasix/alfakit dev-main, inertiajs/inertia-laravel v3.5.1 |
| Filament v5 server | PHP 8.4.23 (fpm-fcgi, OPcache on), Laravel 13.35.0, APP_DEBUG false, config cache off, sqlite; filament/filament v5.10.1, livewire/livewire v4.4.7 |
| Method | 2 warm-up + 7 measured runs per scenario, medians; 2026-10-18 |
| Load average (1/5/15 min) | 2.7 / 6.76 / 9.79 at the start, 2.38 / 4.27 / 7.86 at the end |

#### Server: full page (median time to first byte, HTML size uncompressed / gzip)

| Scenario | AlfaKit (React) | AlfaKit (Vue) | AlfaKit (Svelte) | Filament v5 |
| --- | --- | --- | --- | --- |
| Table, 50 rows, with filters | 37 ms, 105.1 KB / 21.9 KB | 32 ms, 101.4 KB / 21.6 KB | 35 ms, 105.3 KB / 21.9 KB | 64 ms, 1.46 MB / 44.7 KB |
| Table, 500 rows, with filters | 166 ms, 501.3 KB / 54.2 KB | 139 ms, 495.9 KB / 53.8 KB | 141 ms, 502.3 KB / 54.2 KB | 370 ms, 13.41 MB / 281.0 KB |
| Form, 100 fields + repeater | 27 ms, 88.7 KB / 22.5 KB | 24 ms, 85.3 KB / 22.1 KB | 27 ms, 88.8 KB / 22.5 KB | 35 ms, 516.5 KB / 23.1 KB |
| Dashboard, 6 widgets | 23 ms, 59.9 KB / 16.8 KB | 20 ms, 56.4 KB / 16.5 KB | 24 ms, 59.9 KB / 16.8 KB | 18 ms, 66.2 KB / 10.9 KB |
| Global search | 27 ms, 70.1 KB / 18.5 KB | 25 ms, 66.5 KB / 18.2 KB | 27 ms, 70.1 KB / 18.6 KB | 34 ms, 409.4 KB / 23.2 KB |

#### Server: the request behind the interaction (median response time, response size)

| Scenario | AlfaKit (React) | AlfaKit (Vue) | AlfaKit (Svelte) | Filament v5 |
| --- | --- | --- | --- | --- |
| Table, 50 rows, with filters: sort by name | 28 ms, 47.9 KB | 27 ms, 47.7 KB | 27 ms, 48.0 KB | 73 ms, 1.46 MB |
| Table, 500 rows, with filters: sort by name | 143 ms, 445.8 KB | 142 ms, 443.9 KB | 142 ms, 446.8 KB | 459 ms, 13.75 MB |
| Form, 100 fields + repeater: `live()` field round trip | 18 ms, 4.6 KB | 18 ms, 4.6 KB | 18 ms, 4.6 KB | 32 ms, 486.8 KB |
| Dashboard, 6 widgets: widget data | 25 ms, 6.4 KB | 25 ms, 6.4 KB | 25 ms, 6.4 KB | n/a |
| Global search: type a SKU until results show | 54 ms, 0.2 KB | 52 ms, 0.2 KB | 53 ms, 0.2 KB | 49 ms, 7.1 KB |

#### Browser: page load (median time to interactive; total blocking time; DOM nodes)

| Scenario | AlfaKit (React) | AlfaKit (Vue) | AlfaKit (Svelte) | Filament v5 |
| --- | --- | --- | --- | --- |
| Table, 50 rows, with filters | 187 ms; TBT 0 ms; 4,718 nodes | 238 ms; TBT 0 ms; 4,710 nodes | 285 ms; TBT 0 ms; 4,838 nodes | 278 ms; TBT 30 ms; 3,510 nodes |
| Table, 500 rows, with filters | 311 ms; TBT 0 ms; 1,770 nodes | 296 ms; TBT 0 ms; 1,762 nodes | 339 ms; TBT 0 ms; 1,814 nodes | 2648 ms; TBT 1310 ms; 31,500 nodes |
| Form, 100 fields + repeater | 188 ms; TBT 0 ms; 2,334 nodes | 218 ms; TBT 0 ms; 2,347 nodes | 229 ms; TBT 0 ms; 2,220 nodes | 166 ms; TBT 0 ms; 2,068 nodes |
| Dashboard, 6 widgets | 211 ms; TBT 0 ms; 1,075 nodes | 212 ms; TBT 0 ms; 1,072 nodes | 234 ms; TBT 0 ms; 1,093 nodes | 151 ms; TBT 0 ms; 496 nodes |
| Global search | 130 ms; TBT 0 ms; 1,612 nodes | 139 ms; TBT 0 ms; 1,604 nodes | 166 ms; TBT 0 ms; 1,652 nodes | 114 ms; TBT 0 ms; 1,022 nodes |

#### Browser: interaction latency (median, from the input until the result is painted)

| Scenario | AlfaKit (React) | AlfaKit (Vue) | AlfaKit (Svelte) | Filament v5 |
| --- | --- | --- | --- | --- |
| Table, 50 rows, with filters: sort by name | 140 ms | 141 ms | 162 ms | 256 ms |
| Table, 500 rows, with filters: sort by name | 242 ms | 248 ms | 247 ms | 2380 ms |
| Form, 100 fields + repeater: `live()` field round trip | 243 ms | 242 ms | 241 ms | 293 ms |
| Global search: type a SKU until results show | 378 ms | 373 ms | 351 ms | 646 ms |

Notes: Server times are measured over loopback with one sequential client (TTFB for pages, full response time for interaction requests). Time to interactive is when the page is usable (rows rendered, 100 fields mounted, all six widgets loaded, including the deferred widget data) and the main thread has been free of long tasks for 500 ms. Interaction latency is timed from the Playwright input until the change is painted and includes each stack’s default debounce: AlfaKit debounces typed `live()` fields by 150 ms (choices such as selects and toggles refresh at once) and global search by 250 ms; Filament’s global search field debounces by 500 ms and its `live()` fields use Livewire’s `wire:model.live` default. AlfaKit table rows and repeater items are virtualised, so the DOM holds the visible window of a 500-row table.
