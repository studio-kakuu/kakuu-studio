#!/bin/sh
# SessionStart:Lemo-Opuscar のライブラリ(~/lemo-opuscar)と依存(npm・Python .venv)をクラウド環境で毎回そろえる
[ "$CLAUDE_CODE_REMOTE" = "true" ] || exit 0
S=$(ls -t "$HOME"/.claude/plugins/cache/lemolab/lemo-opuscar/*/skills/lemo-opuscar/scripts/setup.sh 2>/dev/null | head -1)
[ -n "$S" ] || S=$HOME/.claude/plugins/marketplaces/lemolab/plugin/skills/lemo-opuscar/scripts/setup.sh
if [ ! -f "$S" ]; then
  S=${TMPDIR:-/tmp}/lemo-opuscar-setup.sh
  curl -fsSL https://raw.githubusercontent.com/lemomo-ai/lemo-opuscar/main/plugin/skills/lemo-opuscar/scripts/setup.sh -o "$S" || exit 0
fi
sh "$S" >/dev/null 2>&1 && sh "$S" deps 2>&1 | tail -1
exit 0
