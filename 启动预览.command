#!/bin/zsh
set -eu

project_root="${0:A:h}"
preview_url='http://127.0.0.1:5173/'
preview_label='local.qincheng.preview'
node_path="$(command -v node || true)"
if [[ -z "$node_path" && -x "$HOME/.local/node/bin/node" ]]; then
  node_path="$HOME/.local/node/bin/node"
fi
if [[ -z "$node_path" ]]; then
  print '未找到 Node.js，请先安装 Node.js 后重新打开。'
  exit 1
fi

if ! /bin/launchctl list "$preview_label" >/dev/null 2>&1; then
  /bin/mkdir -p "$project_root/output"
  /bin/launchctl submit -l "$preview_label" \
    -o "$project_root/output/preview.log" \
    -e "$project_root/output/preview-error.log" \
    -- "$node_path" "$project_root/node_modules/vite/bin/vite.js" \
    "$project_root" --host 127.0.0.1 --port 5173 --strictPort
fi

for attempt in {1..40}; do
  preview_page="$(/usr/bin/curl --noproxy '*' -fsS --max-time 1 "$preview_url" 2>/dev/null || true)"
  if [[ "$preview_page" == *'<title>亲称'* ]]; then
    print "亲称预览已启动：$preview_url"
    print '关闭此终端窗口后，预览仍会继续运行。'
    if [[ "${1:-}" != '--no-open' ]]; then
      /usr/bin/open "$preview_url"
    fi
    exit 0
  fi
  /bin/sleep 0.5
done

print '预览未能启动，请查看 output/preview-error.log。'
print '如果 5173 端口被其他程序占用，请先关闭相应程序。'
exit 1
