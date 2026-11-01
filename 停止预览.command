#!/bin/zsh
set -eu

if /bin/launchctl list local.qincheng.preview >/dev/null 2>&1; then
  /bin/launchctl remove local.qincheng.preview
  print '亲称后台预览已停止。'
else
  print '亲称后台预览当前未运行。'
fi
