# 亲称

亲属称呼查询工具，支持普通话拼音、南北方叫法参考、复杂关系链与亲戚之间的相对称呼。

## 打开本地预览（macOS）

双击 `启动预览.command`，随后访问 <http://127.0.0.1:5173/>。

预览作为独立后台进程运行，关闭终端或聊天窗口后仍可访问。电脑重启或退出登录后，需要再次双击启动。不设置开机自动运行。

双击 `停止预览.command` 可停止后台服务。运行日志位于 `output/preview.log` 和 `output/preview-error.log`。

## 开发

```sh
npm install
npm run dev -- --port 5173 --strictPort
```

修改源代码后，预览会自动更新。后台预览已运行时，无需重复执行开发命令。

```sh
npm test
npm run build
```
# 小红书小工具离线包

执行 `npm run build:minitool`，生成 `dist-minitool/`；执行 `node scripts/audit-minitool.mjs` 校验静态文件。该目录内容可压缩为 ZIP，确保 `index.html` 直接位于 ZIP 根目录。

本次产物与校验摘要位于 `output/minitool/`。上传后还需完成创服平台模拟器、Android 与 iOS 真机扫码验证；静态检查和普通浏览器运行不能代替容器验收。

