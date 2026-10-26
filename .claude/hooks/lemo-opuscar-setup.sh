#!/bin/sh
# SessionStart:Lemo-Opuscar のライブラリ(~/lemo-opuscar)と依存(npm・Python .venv)をクラウド環境で毎回そろえる
# 手動でも実行できる:bash .claude/hooks/lemo-opuscar-setup.sh(ログは ~/.lemo-opuscar-setup.log)
[ "$CLAUDE_CODE_REMOTE" = "true" ] || [ "$1" = "--force" ] || exit 0
LOG=$HOME/.lemo-opuscar-setup.log
# setup.sh の場所:プラグインのキャッシュ → マーケットプレイスの複製 → github.com から取得
# (新しいコンテナではプラグインがまだ無いことがあり、raw.githubusercontent.com はプロキシで拒否されるため git で取る)
S=$(ls -t "$HOME"/.claude/plugins/cache/lemolab/lemo-opuscar/*/skills/lemo-opuscar/scripts/setup.sh 2>/dev/null | head -1)
[ -n "$S" ] || S=$HOME/.claude/plugins/marketplaces/lemolab/plugin/skills/lemo-opuscar/scripts/setup.sh
if [ ! -f "$S" ]; then
  B=$HOME/.lemo-opuscar-bootstrap
  rm -rf "$B"
  git clone --quiet --depth 1 --filter=blob:none --sparse https://github.com/lemomo-ai/lemo-opuscar.git "$B" >>"$LOG" 2>&1 &&
    git -C "$B" sparse-checkout set plugin/skills >>"$LOG" 2>&1
  S=$B/plugin/skills/lemo-opuscar/scripts/setup.sh
  [ -f "$S" ] || { echo "lemo-opuscar: setup.sh を取得できません($LOG)"; exit 0; }
fi
{ sh "$S" && sh "$S" deps; } >>"$LOG" 2>&1
if [ -f "$HOME/lemo-opuscar/node_modules/.lemo-ok" ] && [ -f "$HOME/lemo-opuscar/.venv/.lemo-core" ]; then
  echo "lemo-opuscar: ready ($HOME/lemo-opuscar)"
else
  echo "lemo-opuscar: セットアップ失敗。$LOG を確認"
fi
exit 0
