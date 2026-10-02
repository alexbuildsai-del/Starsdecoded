#!/usr/bin/env bash
# The runtime half of the security gate (ADR-193): what a deploy sends, met from outside the way a page on another site
# meets it. A preview's /api is rewritten to staging's API, which runs main and not the PR, so on a preview only `web`
# speaks for the PR; `full` adds the API, on staging after every merge and on production after every promote.
# A deploy can still be rolling over, so DEADLINE_SECONDS retries every 15 s until it runs out, and only the last pass's
# misses become ::error:: lines. Locally:
#   .github/scripts/security-probe.sh https://starsdecoded-staging.vercel.app full
set -u

usage() {
  echo "usage: $0 <https web_url> web|full   (DEADLINE_SECONDS=<seconds> to retry)" >&2
  exit 2
}

[ "$#" -eq 2 ] || usage
case "$2" in web | full) mode=$2 ;; *) usage ;; esac
base=${1%/}
case "$base" in https://?*) ;; *) usage ;; esac
deadline=${DEADLINE_SECONDS:-0}
case "$deadline" in '' | *[!0-9]*) usage ;; esac
if [ "$mode" = full ] && ! command -v jq >/dev/null; then
  echo "$0: full mode reads the API's answers with jq, which is not installed" >&2
  exit 2
fi

foreign=https://evil.example
session_cookie=sd_session_id
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

misses=""
miss() { misses="${misses}$1"$'\n'; }
lower() { printf '%s' "$1" | tr '[:upper:]' '[:lower:]'; }
said() { if [ "${1:-000}" = 000 ]; then echo nothing; else echo "$1"; fi; }

fetch() {
  local name=$1
  shift
  curl -sS --max-time 20 -D "$work/$name.headers" -o "$work/$name.body" -w '%{http_code}' "$@" 2>/dev/null
}

# Only the last response in a dump counts: a proxy's CONNECT answer or a 100 Continue can sit ahead of it.
values() {
  awk -v want="$(lower "$2"):" '
    /^HTTP\// { n = 0; next }
    { sub(/\r$/, "") }
    tolower(substr($0, 1, length(want))) == want {
      v = substr($0, length(want) + 1)
      sub(/^[ \t]+/, "", v)
      sub(/[ \t]+$/, "", v)
      seen[++n] = v
    }
    END { for (i = 1; i <= n; i++) print seen[i] }
  ' "$work/$1.headers" 2>/dev/null
}

# A browser heeds the first of a repeated header, HSTS by rule (RFC 6797 8.1), so the first is the one judged.
first() { values "$1" "$2" | head -n 1; }

# Browsers read these values without regard to case.
exact() {
  local got
  got=$(first home "$1")
  if [ -z "$got" ]; then
    miss "/ sends no $1"
  elif [ "$(lower "$got")" != "$(lower "$2")" ]; then
    miss "/ sends $1: $got, expected $2"
  fi
}

check_web() {
  local code hsts age policy on feature
  code=$(fetch home "$base/")
  if [ "$code" != 200 ]; then
    miss "/ answered $(said "$code"), expected 200, so its headers were not read"
    return
  fi

  # Vercel adds its own two-year HSTS on vercel.app hosts, so the floor is a year, as ADR-198 sets it, rather than the exact value.
  hsts=$(first home Strict-Transport-Security)
  age=$(lower "$hsts" | sed -nE 's/.*max-age="?([0-9]{1,12}).*/\1/p')
  if [ -z "$hsts" ]; then
    miss "/ sends no Strict-Transport-Security"
  elif [ "${age:-0}" -lt 31536000 ] || ! grep -qi 'includesubdomains' <<<"$hsts"; then
    miss "/ sends Strict-Transport-Security: $hsts, expected a max-age of 31536000 or more with includeSubDomains"
  fi

  exact X-Content-Type-Options nosniff
  exact X-Frame-Options DENY
  exact Referrer-Policy strict-origin-when-cross-origin

  # Other features may join the list; these three must stay off.
  policy=$(first home Permissions-Policy)
  if [ -z "$policy" ]; then
    miss "/ sends no Permissions-Policy"
  else
    on=""
    for feature in camera microphone geolocation; do
      grep -qiE "(^|,)[[:space:]]*$feature=\(\)[[:space:]]*(,|$)" <<<"$policy" || on="$on, $feature"
    done
    if [ -n "$on" ]; then miss "/ sends Permissions-Policy: $policy, which does not turn off ${on#, }"; fi
  fi

  # A report-only policy is worth only its reports. After seven clean days the same policy is enforced (ADR-198), and the
  # enforced header then stands in for it.
  policy=$(first home Content-Security-Policy-Report-Only)
  if [ -n "$policy" ]; then
    grep -qiE '(^|;)[[:space:]]*report-(uri|to)[[:space:]]' <<<"$policy" ||
      miss "/ sends a Content-Security-Policy-Report-Only with no report-uri or report-to, so it reports nothing"
  elif [ -z "$(first home Content-Security-Policy)" ]; then
    miss "/ sends no Content-Security-Policy-Report-Only"
  fi
}

# Without Access-Control-Allow-Origin a browser hands the other site nothing to read (ADR-197). An answer that never came
# proves nothing, so it is a miss too.
no_cors() {
  local acao
  if [ "$3" = 000 ]; then
    miss "$2 from Origin $foreign answered nothing"
    return
  fi
  acao=$(first "$1" Access-Control-Allow-Origin)
  if [ -n "$acao" ]; then miss "$2 from Origin $foreign sends Access-Control-Allow-Origin: $acao"; fi
}

check_api() {
  local code error cookie attrs lacks want edge name
  code=$(fetch health -H "Origin: $foreign" "$base/api/healthz")
  no_cors health "GET /api/healthz" "$code"

  # Through the web host the call passes the root middleware, which adds the edge's secret (ADR-224); without it every
  # per-address limit keys on Vercel's own addresses and all visitors share one count (MB-167).
  if [ "$code" != 000 ]; then
    edge=$(jq -r '.edge' "$work/health.body" 2>/dev/null)
    if [ "$code" != 200 ] || [ "$edge" != true ]; then
      miss "GET /api/healthz answered $code with edge: ${edge:-unreadable}, expected 200 with edge: true"
    fi
  fi
  # The secret rides only on the call upstream; a visitor who read it could name any address again. Only the names are
  # judged, so its value never reaches this public log.
  for name in x-edge-proxy-secret x-middleware-request-x-edge-proxy-secret; do
    if [ -n "$(first health "$name")" ]; then miss "GET /api/healthz sends $name back to the visitor"; fi
  done

  # Health is mounted ahead of every middleware, so a CORS layer that came back would show on a session route first.
  code=$(fetch read -H "Origin: $foreign" "$base/api/admin/me")
  no_cors read "GET /api/admin/me" "$code"

  # The waitlist is the write production serves to everyone. An empty body is refused there too, so even an API without
  # the origin guard stores and sends nothing.
  code=$(fetch write -H "Origin: $foreign" -H 'Content-Type: application/json' --data '{}' "$base/api/waitlist")
  error=$(jq -r '.error? // empty' "$work/write.body" 2>/dev/null)
  if [ "$code" != 403 ] || [ "$error" != forbidden_origin ]; then
    miss "POST /api/waitlist from Origin $foreign answered $(said "$code")${error:+ $error}, expected 403 forbidden_origin"
  fi
  [ "$code" = 000 ] || no_cors write "POST /api/waitlist" "$code"

  # /admin/me answers anyone on both hosts, before launch too, and passes the session middleware that sets the cookie.
  code=$(fetch fresh "$base/api/admin/me")
  cookie=$(values fresh Set-Cookie | grep -i "^$session_cookie=" | head -n 1)
  if [ -z "$cookie" ]; then
    miss "a fresh GET /api/admin/me (answered $(said "$code")) sets no $session_cookie cookie"
    return
  fi
  # The value is a live session id, so only the attributes reach the log.
  attrs=""
  case "$cookie" in *';'*) attrs=${cookie#*;} ;; esac
  lacks=""
  for want in SameSite=Lax Secure HttpOnly; do
    lower "$attrs" | tr ';' '\n' | sed -E 's/^[[:space:]]+//; s/[[:space:]]+$//' | grep -qx "$(lower "$want")" || lacks="$lacks, $want"
  done
  if [ -n "$lacks" ]; then
    miss "a fresh GET /api/admin/me sets $session_cookie without ${lacks#, }:${attrs:- no attributes}"
  fi
}

probe() {
  misses=""
  rm -f "$work"/*
  check_web
  if [ "$mode" = full ]; then check_api; fi
}

end=$((SECONDS + deadline))
while :; do
  probe
  if [ -z "$misses" ]; then
    summary="/ sends HSTS, nosniff, X-Frame-Options, Referrer-Policy, Permissions-Policy and its CSP"
    if [ "$mode" = full ]; then
      summary="$summary; /api/healthz came through the edge, whose secret is not sent back; to Origin $foreign the API sends no CORS header and refuses a write with 403; a fresh visit's $session_cookie is SameSite=Lax, Secure and HttpOnly"
    fi
    echo "security probe ok at $base ($mode): $summary"
    exit 0
  fi
  if [ "$SECONDS" -ge "$end" ]; then
    while IFS= read -r line; do
      [ -n "$line" ] && echo "::error::$base: ${line//%/%25}"
    done <<<"$misses"
    exit 1
  fi
  echo "security probe not right yet at $base ($mode), retrying in 15 s:"
  printf '%s' "$misses"
  sleep 15
done
