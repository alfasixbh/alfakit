#!/usr/bin/env bash
# The browser suite against the built playgrounds, on local ports of its own.
#
# Serves each playground with PHP's built-in server (`ALFAKIT_BUILT_ASSETS=1`, so a Vite dev
# server that happens to run beside it is ignored), runs Playwright against them and stops the
# servers it started. Build first: `pnpm build` and each `pnpm --filter @alfakit/playground-<r> build`.
#
#   scripts/e2e-local.sh                 # every spec, three renderers, all languages
#   scripts/e2e-local.sh docs-forms      # one spec (arguments go to `playwright test`)
#   E2E_SSR=1 scripts/e2e-local.sh ssr   # with the SSR check (builds and starts the SSR servers)
set -u

root="$(cd "$(dirname "$0")/.." && pwd)"
started=()
port=8101

for renderer in react vue svelte; do
  if ! curl -s -o /dev/null -m 3 "http://127.0.0.1:${port}/admin/login"; then
    (
      cd "${root}/playground/${renderer}/public" &&
        ALFAKIT_BUILT_ASSETS=1 APP_URL="http://127.0.0.1:${port}" PHP_CLI_SERVER_WORKERS=4 \
          php -S "127.0.0.1:${port}" ../vendor/laravel/framework/src/Illuminate/Foundation/resources/server.php \
          >"${TMPDIR:-/tmp}/alfakit-e2e-${renderer}.log" 2>&1 &
      echo $! >"${TMPDIR:-/tmp}/alfakit-e2e-${renderer}.pid"
    )
    started+=("${renderer}")
  fi

  port=$((port + 1))
done

if [ "${E2E_SSR:-}" = "1" ]; then
  for renderer in react vue svelte; do
    (cd "${root}/playground/${renderer}" && pnpm run build:ssr >/dev/null 2>&1 && (php artisan inertia:start-ssr >/dev/null 2>&1 &))
  done
fi

sleep 3

cd "${root}/e2e" &&
  E2E_REACT_URL=http://127.0.0.1:8101 E2E_VUE_URL=http://127.0.0.1:8102 E2E_SVELTE_URL=http://127.0.0.1:8103 \
    E2E_LOCALES="${E2E_LOCALES:-1}" pnpm exec playwright test "$@"
status=$?

if [ "${E2E_SSR:-}" = "1" ]; then
  for renderer in react vue svelte; do
    (cd "${root}/playground/${renderer}" && php artisan inertia:stop-ssr >/dev/null 2>&1)
  done
fi

for renderer in "${started[@]:-}"; do
  [ -n "${renderer}" ] && kill "$(cat "${TMPDIR:-/tmp}/alfakit-e2e-${renderer}.pid")" 2>/dev/null
done

exit "${status}"
