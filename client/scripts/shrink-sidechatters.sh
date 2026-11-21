#!/bin/sh
# One-off: shrink landing photos in place to max 384 px, JPEG q75 (macOS sips). Safe to re-run.
cd "$(dirname "$0")/../public/sidechatters" || exit 1
for f in *.jpg; do
  sips -s format jpeg -s formatOptions 75 --resampleHeightWidthMax 384 "$f" >/dev/null
done
du -sh .
