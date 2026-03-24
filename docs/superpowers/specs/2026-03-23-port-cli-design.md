# port-cli Design Spec

## Overview

將 `~/.zshrc` 中的 `port` 和 `kill-port` 兩個 shell function 整合成一個互動式 Node.js CLI 工具，發佈到 npm。

## CLI 名稱

- npm 套件名稱：`port-cli`
- CLI 指令名稱：`port`

## 支援平台

macOS 和有安裝 `lsof` 的 Linux。如果 `lsof` 不存在，顯示明確錯誤訊息並退出。

## 使用方式

```bash
port              # 列出所有使用中的 port，互動選擇後 kill
port 3000         # 查看佔用 port 3000 的程序，互動確認後 kill
```

## 互動流程

### 不帶參數（`port`）

1. 執行 `lsof` 取得所有 listening port
2. 如果沒有任何 listening port，顯示 "No listening ports found" 後結束
3. 以 checkbox 列出程序資訊，格式：`[PID 1234] node :3000 (ubuntu)`
4. 使用者用方向鍵 + 空白鍵多選要殺掉的程序
5. 顯示確認提示：「Kill N selected processes?」，確認後 kill

### 帶參數（`port 3000`）

1. 驗證參數為合法 port 號碼（1-65535 的整數），不合法則顯示錯誤後結束
2. 執行 `lsof` 查特定 port
3. 如果沒有程序佔用，顯示提示後結束
4. 如果有，列出程序資訊，用 confirm 問要不要 kill
5. 確認後 kill

## 專案結構

```
port-cli/
├── package.json
├── bin/
│   └── port.js          # CLI 進入點 (#!/usr/bin/env node)
└── src/
    ├── index.js          # 主邏輯：解析參數、分流兩種模式
    ├── lsof.js           # 執行 lsof 並解析輸出為結構化資料
    └── kill.js           # 執行 kill 程序
```

## 技術決定

- **ESM** — `"type": "module"` in package.json
- **互動套件** — `@inquirer/prompts`（checkbox, confirm）
- **取得 port 資訊** — `child_process.execFileSync('lsof', [...args])` 執行 lsof（用 `execFileSync` 而非 `execSync`，避免 shell injection）。使用 `lsof -F pcnPi` 取得 machine-readable 輸出，解析為 `{ pid, name, user, port }` 陣列
- **kill 程序** — `process.kill(pid, 'SIGTERM')`，預設用 SIGTERM 讓程序有機會清理資源
- **不自動加 sudo** — 使用者自行決定是否用 `sudo port` 執行
- **錯誤處理** — kill 時若遇到 `EPERM`，顯示該程序的錯誤訊息（提示用 sudo），但繼續處理剩餘程序
- **Ctrl+C 處理** — 攔截 `@inquirer/prompts` 的 `ExitPromptError`，乾淨地退出（exit code 0）

## Exit Codes

- `0` — 成功或使用者取消
- `1` — 錯誤（參數不合法、lsof 不存在等）

## package.json 重點

```json
{
  "name": "port-cli",
  "type": "module",
  "bin": {
    "port": "./bin/port.js"
  },
  "dependencies": {
    "@inquirer/prompts": "^7.0.0"
  }
}
```
