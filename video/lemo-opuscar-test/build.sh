#!/bin/sh
# Lemo-Opuscar 導入テスト(5秒・1080×1920・無音)を書き出す
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
LIB=${LIB:-$HOME/lemo-opuscar}
mkdir -p "$HERE/fonts"
cp "$HERE/../remotion/public/fonts/SpaceGrotesk-Bold.ttf" "$HERE/../remotion/public/fonts/ZenKakuGothicNew-Bold.ttf" "$HERE/fonts/"
cd "$LIB"
node core/render/video.mjs "$HERE" --fps 24 --size 1080x1920 --out "$HERE/out/video.mp4"
mkdir -p "$HERE/../../videos/lemo-opuscar-test"
cp "$HERE/out/video.mp4" "$HERE/../../videos/lemo-opuscar-test/kakuu-lemo-test_1080x1920.mp4"
