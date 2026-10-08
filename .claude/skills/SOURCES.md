# 導入スキルの出どころ(公式のみ)

このフォルダのスキルは、すべて各開発元の **公式GitHubリポジトリ** から無改変でコピーしたものです。
`git clone --depth 1` で取得し、取得時のコミットを記録しています。更新するときは同じ手順で取り直し、この表を更新してください。

| スキル | 公式リポジトリ | 取得コミット | ライセンス |
|---|---|---|---|
| `frontend-design` | [anthropics/skills](https://github.com/anthropics/skills) `skills/frontend-design` | `683bc88e56f3e09ba94f7055977f3d3aa499f202`(2026-10-05) | Apache-2.0(同梱 `LICENSE.txt`) |
| `gsap-core` `gsap-timeline` `gsap-scrolltrigger` `gsap-plugins` `gsap-utils` `gsap-react` `gsap-frameworks` `gsap-performance` | [greensock/gsap-skills](https://github.com/greensock/gsap-skills) `skills/*` | `aed9cfd3277740755f6bfc1155c7aa645403b760`(2026-04-21) | MIT(各フォルダに `LICENSE` を同梱。`skills/llms.txt` は `gsap-core/` に同梱) |
| `remotion-best-practices` `remotion-create` `remotion-markup` `remotion-render` `remotion-studio` `remotion-captions` `remotion-multimedia` `remotion-interactivity` `remotion-maps` `remotion-saas` `remotion-docs` `remotion-upgrade` | [remotion-dev/skills](https://github.com/remotion-dev/skills) `skills/*` | `32b241b97f4e0e4ab61fe9a41b05e6e64503f8c5`(2026-10-07) | リポジトリにライセンスファイルなし(Remotion本体は「Remotion License」:個人・従業員3人以下の会社は無料) |

- `remotion-best-practices` は他のRemotionスキルへの入口(ルーター)で、中に他スキルの複製を含みます(公式のまま)。
- 取り直し手順:
  ```bash
  git clone --depth 1 https://github.com/anthropics/skills.git /tmp/a && cp -r /tmp/a/skills/frontend-design .claude/skills/
  git clone --depth 1 https://github.com/greensock/gsap-skills.git /tmp/g && cp -r /tmp/g/skills/gsap-* .claude/skills/
  git clone --depth 1 https://github.com/remotion-dev/skills.git /tmp/r && cp -r /tmp/r/skills/remotion-* .claude/skills/
  ```
