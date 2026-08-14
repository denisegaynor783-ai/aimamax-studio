#!/usr/bin/env bash
set -euo pipefail
cd /Users/laoba/Documents/ai导演台/aimamax-studio
owner=denisegaynor783-ai
repo=aimamax-studio
branch=main

# 列出所有已跟踪文件（跳过 .github/workflows/，API 需 workflow 作用域）
: > /tmp/src_tree.json
printf '[' > /tmp/src_tree.json
first=1
count=0
while IFS= read -r f; do
  [ -z "$f" ] && continue
  case "$f" in
    .github/workflows/*) continue ;;   # 需 workflow 作用域，留待用户本机 git push
  esac
  : > /tmp/blob.json
  printf '{"content":"' >> /tmp/blob.json
  base64 < "$f" | tr -d '\n' >> /tmp/blob.json
  printf '","encoding":"base64"}' >> /tmp/blob.json
  sha=$(gh api --method POST "repos/$owner/$repo/git/blobs" --input /tmp/blob.json --jq '.sha')
  if [ $first -eq 0 ]; then printf ',' >> /tmp/src_tree.json; fi
  first=0
  printf '{"path":"%s","mode":"100644","type":"blob","sha":"%s"}' "$f" "$sha" >> /tmp/src_tree.json
  count=$((count+1))
done < <(git ls-files | sort)
printf ']' >> /tmp/src_tree.json
echo "源码文件数: $count"

# 父提交 = 远端 main 当前 head
parent=$(gh api "repos/$owner/$repo/git/refs/heads/$branch" --jq '.object.sha')
echo "main 父提交: $parent"

/Users/laoba/.workbuddy/binaries/python/versions/3.13.12/bin/python3 - <<'PY'
import json
arr = json.load(open('/tmp/src_tree.json'))
json.dump({"tree": arr}, open('/tmp/src_tree_body.json','w'))
print("src tree 条目数:", len(arr))
PY

tree_sha=$(gh api --method POST "repos/$owner/$repo/git/trees" --input /tmp/src_tree_body.json --jq '.sha')
echo "tree_sha=$tree_sha"

commit_body=$(printf '{"message":"feat: 3D 导演台 + 画布故事板条（源码同步）","tree":"%s","parents":["%s"]}' "$tree_sha" "$parent")
commit_sha=$(printf '%s' "$commit_body" | gh api --method POST "repos/$owner/$repo/git/commits" --input - --jq '.sha')
echo "commit_sha=$commit_sha"

gh api --method PATCH "repos/$owner/$repo/git/refs/heads/$branch" -f "sha=$commit_sha" --jq '.ref'
echo "SOURCE PUSH DONE"
