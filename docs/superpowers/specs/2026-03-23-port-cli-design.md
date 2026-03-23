# port-cli Design Spec

## Overview

將 `~/.zshrc` 中的 `port` 和 `kill-port` 兩個 shell function 整合成一個互動式 Node.js CLI 工具，發佈到 npm。

## CLI 名稱

- npm 套件名稱：`port-cli`
- CLI 指令名稱：`port`

## 使用方式

```bash
port              # 列出所有使用中的 port，互動選擇後 kill
port 3000         # 查看佔用 port 3000 的程序，互動確認後 kill
```

## 互動流程

### 不帶參數（`port`）

1. 執行 `lsof -i -P -n -sTCP:LISTEN` 取得所有 listening port
2. 以 checkbox 列出程序資訊（PID、程序名、port、使用者）
3. 使用者用方向鍵 + 空白鍵多選要殺掉的程序
4. 顯示確認提示，確認後 kill 選中的程序

### 帶參數（`port 3000`）

1. 執行 `lsof -i :{port} -P -n -sTCP:LISTEN` 查特定 port
2. 如果沒有程序佔用，顯示提示後結束
3. 如果有，列出程序資訊，用 confirm 問要不要 kill
4. 確認後 kill

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
- **取得 port 資訊** — `child_process.execSync` 執行 `lsof`，解析輸出為 `{ pid, name, user, port }` 陣列
- **kill 程序** — `process.kill(pid, 'SIGKILL')`，不需呼叫外部指令
- **不自動加 sudo** — 使用者自行決定是否用 `sudo port` 執行；權限不足時顯示錯誤訊息提示用 sudo

## package.json 重點

```json
{
  "name": "port-cli",
  "type": "module",
  "bin": {
    "port": "./bin/port.js"
  },
  "dependencies": {
    "@inquirer/prompts": "latest"
  }
}
```
