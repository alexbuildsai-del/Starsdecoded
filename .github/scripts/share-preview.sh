#!/usr/bin/env bash
# What a link to the site shows on WhatsApp and Facebook (ADR-229): the home page and the cover its og:image names, fetched
# as each crawler. Every deploy's head names the cover on production's host (head.ts), so the cover is read from
# the host under test, where a staging deploy has it before a Release puts it on production. From GitHub's network this
# sees a block keyed to the user agent and a challenge page, never a block keyed to Meta's own addresses.
# DEADLINE_SECONDS retries every 15 s, and only the last pass's misses become ::error:: lines, as in the security probe.
# Locally, a deploy or a `vite preview` of a build:
#   .github/scripts/share-preview.sh https://starsdecoded-staging.vercel.app
set -u

usage() {
  echo "usage: $0 <http(s) web_url>   (DEADLINE_SECONDS=<seconds> to retry)" >&2
  exit 2
}

[ "$#" -eq 1 ] || usage
base=${1%/}
case "$base" in https://?* | http://?*) ;; *) usage ;; esac
deadline=${DEADLINE_SECONDS:-0}
case "$deadline" in '' | *[!0-9]*) usage ;; esac

site=https://mystarsdecoded.com
agents=("WhatsApp/2.24 A" "facebookexternalhit/1.1")
# Meta's 600 KB is unconfirmed (share-cover spec), so it is read the stricter way, in thousands of bytes.
max_bytes=600000

work=$(mktemp -d) || exit 2
trap 'rm -rf "$work"' EXIT

misses=""
seen=""
miss() { misses="${misses}$1"$'\n'; }
lower() { printf '%s' "$1" | tr '[:upper:]' '[:lower:]'; }
said() { if [ "${1:-000}" = 000 ]; then echo nothing; else echo "$1"; fi; }

# Sets code, bytes and rc. curl's exit is kept because it is the one sign of a body cut short when no length was announced.
get() {
  local out
  out=$(curl -sS --max-time 20 -A "$2" -D "$work/$1.headers" -o "$work/$1.body" -w '%{http_code} %{size_download}' "$3" 2>/dev/null)
  rc=$?
  code=${out%% *}
  bytes=${out##* }
  case "$bytes" in '' | *[!0-9]*) bytes=0 ;; esac
}

# Only the last response in a dump counts: a proxy's CONNECT answer can sit ahead of it.
header() {
  awk -v want="$(lower "$2"):" '
    /^HTTP\// { v = ""; found = 0; next }
    { sub(/\r$/, "") }
    !found && tolower(substr($0, 1, length(want))) == want {
      v = substr($0, length(want) + 1)
      sub(/^[ \t]+/, "", v)
      sub(/[ \t]+$/, "", v)
      found = 1
    }
    END { print v }
  ' "$work/$1.headers" 2>/dev/null
}

# A miss is only worth reading with who answered: the server, the edge's own mark of a block or a challenge, where a
# redirect points. A challenge can answer 200, so this rides on every miss, after any note of the caller's.
why() {
  local name value notes=${2:-}
  for name in Server X-Vercel-Mitigated Cf-Mitigated Location; do
    value=$(header "$1" "$name")
    if [ -n "$value" ]; then notes="${notes:+$notes; }$(lower "$name"): $value"; fi
  done
  if [ -n "$notes" ]; then printf ' (%s)' "$notes"; fi
}

# The crawlers read the tags from the head, which a page may write on one line or many.
head_of() {
  tr '\r\n' '  ' <"$work/$1.body" | awk '{ i = index(tolower($0), "</head>"); print (i ? substr($0, 1, i - 1) : $0) }'
}

# The content of the head's first meta tag with property="$2", or name="$2", which the crawlers read as well.
meta() {
  local tag named="[[:space:]](property|name)=[\"']$2[\"']"
  local double='[[:space:]]content="([^"]*)"' single="[[:space:]]content='([^']*)'"
  while IFS= read -r tag; do
    [[ $tag =~ $named ]] || continue
    if [[ $tag =~ $double || $tag =~ $single ]]; then
      printf '%s\n' "${BASH_REMATCH[1]}"
      return
    fi
  done < <(head_of "$1" | grep -oiE '<meta[[:space:]][^>]*>')
}

# A challenge page can answer 200 too; its title tells it from ours.
page_title() {
  local title
  title=$(head_of "$1" | grep -oiE '<title[^>]*>[^<]*' | head -n 1 | sed -E 's/^<[^>]*>//' | cut -c 1-80)
  printf '%s' "${title:-none}"
}

check() {
  local agent=$1 n=$2 home="$base/" before=$misses title image url mime length size opens closes
  get "home$n" "$agent" "$home"
  if [ "$code" != 200 ]; then
    miss "$home answered $(said "$code") to $agent, expected 200$(why "home$n")"
    return
  fi
  size=$bytes
  title=$(meta "home$n" og:title)
  image=$(meta "home$n" og:image)
  image=${image//&amp;/"&"}
  if [ -z "$title" ]; then
    miss "$home answered 200 to $agent with no og:title in its head$(why "home$n" "page title: $(page_title "home$n")")"
  fi
  if [ -z "$image" ]; then
    miss "$home answered 200 to $agent with no og:image in its head$(why "home$n" "page title: $(page_title "home$n")")"
    return
  fi
  case "$image" in
    "$site"/?*) ;;
    *)
      miss "$home answered 200 to $agent with og:image $image, expected $site/<path>"
      return
      ;;
  esac

  url=$base${image#"$site"}
  get "cover$n" "$agent" "$url"
  if [ "$code" != 200 ]; then
    miss "og:image $url answered $(said "$code") to $agent, expected 200 with the whole image$(why "cover$n")"
    return
  fi
  mime=$(lower "$(header "cover$n" Content-Type)")
  mime=${mime%%[;[:space:]]*}
  if [ "$mime" != image/jpeg ]; then
    miss "og:image $url answered 200 ${mime:-with no Content-Type} to $agent, expected image/jpeg$(why "cover$n")"
    return
  fi
  length=$(header "cover$n" Content-Length)
  if [ "$rc" != 0 ]; then
    miss "og:image $url answered 200 to $agent and broke off after $bytes bytes (curl exit $rc)"
    return
  fi
  if [ -n "$length" ] && [ "$length" != "$bytes" ]; then
    miss "og:image $url answered 200 to $agent with $bytes of the $length bytes it announced"
    return
  fi
  if [ "$bytes" -gt "$max_bytes" ]; then
    miss "og:image $url answered 200 to $agent with $bytes bytes, over 600 KB ($max_bytes bytes)"
  fi
  # A Content-Type can say image/jpeg over a page or a slice of one, so the bytes must open and close as a JPEG does.
  opens=$(head -c 3 "$work/cover$n.body" | od -An -tx1 | tr -d ' \n')
  closes=$(tail -c 2 "$work/cover$n.body" | od -An -tx1 | tr -d ' \n')
  if [ "$opens" != ffd8ff ] || [ "$closes" != ffd9 ]; then
    miss "og:image $url answered 200 image/jpeg to $agent with a body that is not a whole JPEG: it opens ${opens:-empty} and closes ${closes:-empty}, expected ffd8ff and ffd9"
  fi

  if [ "$misses" = "$before" ]; then
    seen="${seen}  $agent: / 200, $size bytes, og:title \"$title\", og:image $image; ${url#"$base"} from this host 200 image/jpeg, $bytes bytes, whole"$'\n'
  fi
}

probe() {
  local i
  misses=""
  seen=""
  rm -f "${work:?}"/*
  for i in "${!agents[@]}"; do check "${agents[$i]}" "$i"; done
}

end=$((SECONDS + deadline))
while :; do
  probe
  if [ -z "$misses" ]; then
    echo "share preview ok at $base:"
    printf '%s' "$seen"
    exit 0
  fi
  if [ "$SECONDS" -ge "$end" ]; then
    while IFS= read -r line; do
      [ -n "$line" ] && echo "::error::${line//%/%25}"
    done <<<"$misses"
    exit 1
  fi
  echo "share preview not right yet at $base, retrying in 15 s:"
  printf '%s' "$misses"
  sleep 15
done
