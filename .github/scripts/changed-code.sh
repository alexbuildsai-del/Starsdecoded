#!/usr/bin/env bash
# Does a push touch anything a visitor, a test or a build can feel? Prints `true` when any changed path is outside
# docs/, .claude/ and *.md, and `false` when every path is inside them. It answers `true` whenever it cannot tell (no
# base, an API error, an empty or very long file list), so a gap here only ever costs minutes, never a skipped check.
# Needs gh, jq, GH_TOKEN and GITHUB_REPOSITORY. Locally:
#   GH_TOKEN=$(gh auth token) GITHUB_REPOSITORY=owner/repo .github/scripts/changed-code.sh compare <base> <head>
#   .github/scripts/changed-code.sh commit <sha>
set -u

zero=0000000000000000000000000000000000000000

say() { echo "$1"; exit 0; }
open() { echo "changed-code: $1; so the checks run" >&2; say true; }

case "${1:-}" in
  compare)
    [ "$#" -eq 3 ] || open "compare needs a base and a head"
    [ "$2" != "$zero" ] || open "there is no base commit (a new branch)"
    endpoint="compare/$2...$3"
    ;;
  commit)
    [ "$#" -eq 2 ] || open "commit needs a sha"
    endpoint="commits/$2"
    ;;
  *) open "unknown mode '${1:-}'" ;;
esac

# A rename lists both names, so moving a code file into docs/ still counts as a code change.
paths=$(gh api --paginate "repos/$GITHUB_REPOSITORY/$endpoint?per_page=100" \
  --jq '.files[] | .filename, (.previous_filename // empty)' 2>/dev/null) || open "the API gave no list for $endpoint"

[ -n "$paths" ] || open "$endpoint lists no files"
# GitHub stops listing a diff at 3000 files; a list that long is a code change anyway.
[ "$(printf '%s\n' "$paths" | wc -l)" -lt 3000 ] || open "$endpoint lists 3000 files or more"

while IFS= read -r path; do
  case "$path" in
    docs/* | .claude/* | *.md) ;;
    *) echo "changed-code: $path is not docs" >&2; say true ;;
  esac
done <<< "$paths"

say false
