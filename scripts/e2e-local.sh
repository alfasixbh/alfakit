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
#   E2E_REALTIME=1 scripts/e2e-local.sh realtime   # real-time: Reverb and a queue worker per playground
#   E2E_DEBUG_OFF=1 scripts/e2e-local.sh debug-off # as in production: sites of their own with APP_DEBUG=false
#   E2E_BILLING=1 scripts/e2e-local.sh billing     # Stripe checkout and portal against a stand-in for Stripe's API
set -u

root="$(cd "$(dirname "$0")/.." && pwd)"
started=()
first_port=8101
realtime=()
debug=()

if [ "${E2E_DEBUG_OFF:-}" = "1" ]; then
  # Sites of their own (8121-8123), so the ones a normal run reuses keep debug mode.
  first_port=8121
  debug=(APP_DEBUG=false)
fi

if [ "${E2E_BILLING:-}" = "1" ]; then
  # Sites of their own (8131-8133) whose Cashier talks to the stand-in the spec starts on
  # 8140. The key and the webhook secret are made up: nothing reaches Stripe.
  first_port=8131
  debug=(STRIPE_API_BASE=http://127.0.0.1:8140 STRIPE_KEY=pk_test_standin STRIPE_SECRET=sk_test_standin STRIPE_WEBHOOK_SECRET=whsec_standin)
fi

port=${first_port}

if [ "${E2E_REALTIME:-}" = "1" ]; then
  # The sites have to be started with realtime on: stop the ones this script started earlier.
  pkill -f "php -S 127.0.0.1:810" 2>/dev/null
  sleep 1
  realtime=(ALFAKIT_REALTIME=1 BROADCAST_CONNECTION=reverb)
fi

for renderer in react vue svelte; do
  if [ "${E2E_REALTIME:-}" = "1" ]; then
    # Reverb on 8111-8113 (REVERB_PORT in each playground's .env, see `php artisan
    # alfakit:realtime`) and a queue worker: broadcasts are queued.
    (
      cd "${root}/playground/${renderer}" &&
        env "${realtime[@]}" php artisan reverb:start --host=127.0.0.1 --port="$((port + 10))" \
          >"${TMPDIR:-/tmp}/alfakit-e2e-reverb-${renderer}.log" 2>&1 &
    )
    (
      cd "${root}/playground/${renderer}" &&
        env "${realtime[@]}" APP_URL="http://127.0.0.1:${port}" php artisan queue:work --sleep=1 --tries=1 \
          >"${TMPDIR:-/tmp}/alfakit-e2e-queue-${renderer}.log" 2>&1 &
    )
  fi

  if ! curl -s -o /dev/null -m 3 "http://127.0.0.1:${port}/admin/login"; then
    (
      cd "${root}/playground/${renderer}/public" &&
        env ${realtime[@]+"${realtime[@]}"} ${debug[@]+"${debug[@]}"} \
        ALFAKIT_BUILT_ASSETS=1 APP_URL="http://127.0.0.1:${port}" PHP_CLI_SERVER_WORKERS=4 \
          php -S "127.0.0.1:${port}" ../vendor/laravel/framework/src/Illuminate/Foundation/resources/server.php \
          >"${TMPDIR:-/tmp}/alfakit-e2e-${renderer}.log" 2>&1 &
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
  E2E_REACT_URL="http://127.0.0.1:${first_port}" E2E_VUE_URL="http://127.0.0.1:$((first_port + 1))" \
    E2E_SVELTE_URL="http://127.0.0.1:$((first_port + 2))" \
    E2E_LOCALES="${E2E_LOCALES:-1}" E2E_REALTIME="${E2E_REALTIME:-}" E2E_DEBUG_OFF="${E2E_DEBUG_OFF:-}" E2E_BILLING="${E2E_BILLING:-}" \
    pnpm exec playwright test "$@"
status=$?

if [ "${E2E_SSR:-}" = "1" ]; then
  for renderer in react vue svelte; do
    (cd "${root}/playground/${renderer}" && php artisan inertia:stop-ssr >/dev/null 2>&1)
  done
fi

# Stop what this run started. By command line, not by pid: PHP's own launcher may sit between
# the shell and the process that listens.
if [ "${E2E_REALTIME:-}" = "1" ]; then
  pkill -f "artisan reverb:start --host=127.0.0.1 --port=811" 2>/dev/null
  pkill -f "artisan queue:work --sleep=1 --tries=1" 2>/dev/null
fi

port=${first_port}

for renderer in react vue svelte; do
  case " ${started[*]:-} " in
    *" ${renderer} "*) pkill -f "php -S 127.0.0.1:${port}" 2>/dev/null ;;
  esac

  port=$((port + 1))
done

exit "${status}"
