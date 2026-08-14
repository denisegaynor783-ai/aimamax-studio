#!/usr/bin/env bash
set -euo pipefail
cd /Users/laoba/Documents/ai导演台/aimamax-studio
owner=denisegaynor783-ai
repo=aimamax-studio
branch=gh-pages

# 收集 dist 下所有文件（相对路径）
: > /tmp/dist_tree.json
printf '[' > /tmp/dist_tree.json
first=1
count=0
while IFS= read -r f; do
  rel=${f#dist/}
  # 把 base64 内容写入文件（避免大文件塞满 argv 触发 ARG_MAX）
  : > /tmp/blob.json
  printf '{"content":"' >> /tmp/blob.json
  base64 < "$f" | tr -d '\n' >> /tmp/blob.json
  printf '","encoding":"base64"}' >> /tmp/blob.json
  sha=$(gh api --method POST "repos/$owner/$repo/git/blobs" --input /tmp/blob.json --jq '.sha')
  if [ $first -eq 0 ]; then printf ',' >> /tmp/dist_tree.json; fi
  first=0
  printf '{"path":"%s","mode":"100644","type":"blob","sha":"%s"}' "$rel" "$sha" >> /tmp/dist_tree.json
  count=$((count+1))
done < <(find dist -type f | sort)
printf ']' >> /tmp/dist_tree.json
echo "dist 文件数: $count"

# gh-pages 若已存在则取其 head 作为父提交，否则无父
parent=""
if gh api "repos/$owner/$repo/git/refs/heads/$branch" --jq '.object.sha' >/tmp/parent.txt 2>/dev/null; then
  parent=$(cat /tmp/parent.txt)
  echo "gh-pages 已存在，父提交: $parent"
else
  echo "gh-pages 不存在，将创建初始提交"
fi

# 包装成 {"tree":[...]}
/Users/laoba/.workbuddy/binaries/python/versions/3.13.12/bin/python3 - <<'PY'
import json
arr = json.load(open('/tmp/dist_tree.json'))
json.dump({"tree": arr}, open('/tmp/dist_tree_body.json','w'))
print("dist tree 条目数:", len(arr))
PY

echo "创建 tree ..."
tree_sha=$(gh api --method POST "repos/$owner/$repo/git/trees" --input /tmp/dist_tree_body.json --jq '.sha')
echo "tree_sha=$tree_sha"

# 构造 commit body
if [ -n "$parent" ]; then
  commit_body=$(printf '{"message":"deploy: rebuild site","tree":"%s","parents":["%s"]}' "$tree_sha" "$parent")
else
  commit_body=$(printf '{"message":"deploy: initial site","tree":"%s","parents":[]}' "$tree_sha")
fi
echo "创建 commit ..."
commit_sha=$(printf '%s' "$commit_body" | gh api --method POST "repos/$owner/$repo/git/commits" --input - --jq '.sha')
echo "commit_sha=$commit_sha"

if [ -n "$parent" ]; then
  echo "更新 $branch ..."
  gh api --method PATCH "repos/$owner/$repo/git/refs/heads/$branch" -f "sha=$commit_sha" --jq '.ref'
else
  echo "创建 $branch ..."
  gh api "repos/$owner/$repo/git/refs" -f "ref=refs/heads/$branch" -f "sha=$commit_sha" --jq '.ref'
fi
echo "DIST DEPLOY DONE"
