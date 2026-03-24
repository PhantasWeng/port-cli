# CLI Visual Design Spec

## Overview

為 port-cli 加上豐富的視覺呈現：色彩、對齊表格、icon 符號、摘要行，提升 CLI 的設計感。

## 依賴

- `chalk` — 色彩輸出，自動偵測終端能力（pipe/redirect 時自動關閉色彩）

不引入額外框線或表格庫，用 chalk + 手動 padding 實現。

## 色彩方案

| 元素 | 色彩 |
|------|------|
| Header icon + 標題 | `chalk.bold.cyan('⚡')` + `chalk.bold(' port-cli')` |
| 表格欄位標題 (PID, PROCESS, PORT, USER) | `chalk.dim` |
| PID 值 | `chalk.gray` |
| 程序名 | `chalk.white.bold` |
| Port 號 | `chalk.cyan` |
| User | `chalk.gray` |
| 摘要行 (N processes listening) | `chalk.dim` |
| Kill 成功 | `chalk.green('✔')` + 訊息 |
| Kill 失敗 | `chalk.red('✖')` + 訊息 |
| 空結果提示 | `chalk.yellow` |
| 錯誤訊息 | `chalk.red` |

## 顯示格式

### List-All Mode (`port`)

```
⚡ port-cli

  PID     PROCESS   PORT    USER
  1234    node      :3000   ubuntu
  5678    nginx     :80     root

  2 processes listening
```

Header 後空一行，表格前有兩格縮排。欄位用固定寬度對齊：
- PID: 8 字元
- PROCESS: 10 字元（超長名稱截斷加 `…`，如 `chromium-b…`）
- PORT: 8 字元
- USER: 剩餘

表格後空一行，顯示摘要行。之後進入 checkbox 互動。

### Single-Port Mode (`port 3000`)

```
⚡ port :3000

  PID     PROCESS   PORT    USER
  1234    node      :3000   ubuntu

  1 process listening
```

Header 變成 `⚡ port :PORT`，port 號用 cyan。其餘格式同 list-all。

### Kill 結果

```
  ✔ Killed PID 1234 (node :3000)
  ✖ PID 5678: Permission denied. Try running with sudo.
```

### 空結果

```
⚡ port-cli

  No listening ports found.
```

```
⚡ port :3000

  No process listening on port 3000.
```

### 錯誤

```
Invalid port: "abc". Must be an integer between 1 and 65535.
```

錯誤訊息用 `chalk.red`。格式與現有 `parseArgs` 的 throw message 一致（不加 `Error:` 前綴）。

## Checkbox 選項格式

inquirer checkbox 的 `name` 欄位也要用同樣的表格對齊格式（但不含色彩，因為 inquirer 自行管理 highlight）：

```
[PID 1234] node      :3000   (ubuntu)
```

保持目前格式不變，不強制對齊（inquirer 選項內容過度格式化反而不好看）。

## 實作範圍

- 新增 `src/format.js` — 所有格式化函式集中管理，所有函式皆為 named export，回傳字串（由呼叫端傳給 `console.log`/`console.error`）
  - `formatHeader(port?)` — 產生 header 行（`port` 為 number 或 undefined）
  - `formatTable(entries)` — 產生對齊表格字串。`entries` 為 `{ pid: number, name: string, port: number, user: string }[]`
  - `formatSummary(count)` — 產生摘要行（自動處理單複數：`1 process` / `N processes`）
  - `formatKillResult({ success, error }, entry)` — 產生 kill 結果行。第一個參數為 `killProcess()` 的回傳值，`entry` 為 `{ pid, name, port }` 用於顯示
  - `formatEmpty(port?)` — 產生空結果提示
  - `formatError(message)` — 產生錯誤訊息
- 修改 `src/index.js` — 將 console.log 替換為 format 函式
- confirm/checkbox prompt 訊息維持現狀，不加色彩（inquirer 自行管理互動式 highlight）

## 色彩 Fallback

chalk 5.x 自動偵測終端能力：
- 互動式終端：全色彩
- pipe/redirect (`port | grep node`)：自動關閉色彩
- 可透過 `NO_COLOR` 或 `FORCE_COLOR` 環境變數覆蓋
