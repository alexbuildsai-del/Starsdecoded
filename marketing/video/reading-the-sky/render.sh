#!/bin/sh
# Renders chapter 1 in both formats locally; never a cloud render.
export HYPERFRAMES_NO_TELEMETRY=1 HYPERFRAMES_SKIP_SKILLS=1
export HYPERFRAMES_BROWSER_PATH=${HYPERFRAMES_BROWSER_PATH:-/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell}
cd "$(dirname "$0")"
node tools/build.mjs > /dev/null
for f in 9x16 16x9; do (cd ch1-$f && npx -y hyperframes@0.8.96 render -o ../renders/reading-the-sky-ch1-$f.mp4 --quiet); done
