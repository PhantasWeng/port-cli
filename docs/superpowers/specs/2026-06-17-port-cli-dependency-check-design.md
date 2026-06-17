# port-cli — 外部命令依賴檢查

**日期**：2026-06-17
**狀態**：設計完成，待實作

## 問題

`port-cli` 會 shell out 呼叫外部命令 `lsof`（列出 listening ports）與 `ps`（取得 process 啟動指令）。若系統未安裝這些命令，使用者目前只會看到失敗或功能默默缺失，不知道缺了什麼、該裝什麼。

## 目標

1. **每次啟動 preflight**：執行前先檢查依賴。
   - 缺少**必要**命令（`lsof`）→ 印出清楚的錯誤與安裝提示，`exit 1`。
   - 缺少**選用**命令（`ps`）→ 印一行警告（含安裝提示），但**繼續執行**（cwd 仍可顯示，只是少了 command 欄）。
2. **`port doctor` 子指令**：使用者主動執行時，列出所有依賴的安裝狀態（✓/✗）與用途。

## 偵測方式

掃 `PATH`：用 Node `fs` 逐一檢查 `process.env.PATH` 各目錄下是否有可執行的同名檔案。免 subprocess、不依賴 `which` 之類的外部工具、跨 macOS/Linux 穩定。

（評估過 `which <cmd>` subprocess 與「實際執行」兩種替代方案：前者多依賴一個可能不存在的 `which` 並多開行程；後者有副作用且最重。均不採用。）

## 架構

新增模組 `src/deps.js`，單一職責：定義依賴清單、偵測命令存在性、產生提示與報告文字。

```
src/deps.js   ← 新增
src/index.js  ← 接線：doctor 子指令 + 啟動 preflight
src/lsof.js   ← 不動（既有 ENOENT 守衛保留為安全網）
```

### `src/deps.js`

依賴清單（模組常數）：

```js
export const DEPENDENCIES = [
  {
    cmd: 'lsof',
    required: true,
    purpose: '列出 listening ports',
    hints: { linux: 'apt install lsof（或你的發行版套件）', darwin: 'brew install lsof' },
  },
  {
    cmd: 'ps',
    required: false,
    purpose: '顯示 process 啟動指令',
    hints: { linux: 'apt install procps', darwin: 'macOS 內建' },
  },
];
```

匯出函式：

- `commandExists(cmd, pathEnv = process.env.PATH)` → `boolean`
  唯一的 impure 邊界。將 `pathEnv` 以 `:` 切分，對每個目錄檢查 `join(dir, cmd)` 是否為可執行檔（`fs.accessSync(p, fs.constants.X_OK)` 成功即視為存在）。任何一個命中即回 `true`；全部失敗或 `pathEnv` 為空 → `false`。個別 `accessSync` 拋錯以 try/catch 忽略。
- `installHint(dep, platform = process.platform)` → `string`
  `platform === 'darwin'` → `dep.hints.darwin`；`platform === 'linux'` → `dep.hints.linux`；其他 → fallback `請用你的套件管理員安裝 ${dep.cmd}`。
- `checkDependencies(deps = DEPENDENCIES, existsFn = commandExists)` → `Array<{ cmd, required, purpose, found, hint }>`
  純函式（注入 `existsFn` 以利測試）。對每個 dep 計算 `found = existsFn(dep.cmd)`、`hint = installHint(dep)`，回傳結果陣列。
- `formatDoctorReport(results)` → `string`
  多行報告。標題 `依賴檢查：`，每個 dep 一行 `  ✓ <cmd> 已安裝  — <purpose>` 或 `  ✗ <cmd> 未安裝  — <purpose>`，缺少者下一行縮排顯示 `安裝：<hint>`。
- `formatPreflightProblems(results)` → `{ errors: string[], warnings: string[] }`
  純函式。對 `!found` 的 dep：`required` → 推入 `errors`（`❌ 缺少必要命令 <cmd>：無法<purpose>\n   安裝：<hint>`）；非 `required` → 推入 `warnings`（`⚠  <cmd> 未安裝：將無法<purpose>（安裝：<hint>）`）。全部存在時兩陣列皆空。`purpose` 為動詞片語（如「列出 listening ports」），故 `無法<purpose>` 讀作「無法列出 listening ports」。

### `src/index.js` 接線

- **doctor 子指令**：在 `main(args)` 進入 `parseArgs` 之前攔截：
  ```js
  if (args[0] === 'doctor') {
    const results = checkDependencies();
    console.log(formatDoctorReport(results));
    process.exit(results.some((r) => r.required && !r.found) ? 1 : 0);
  }
  ```
  不動 `parseArgs`，現有測試不受影響。
- **啟動 preflight**：`parseArgs` 成功後、呼叫 `listAllMode`/`singlePortMode` 之前：
  ```js
  const { errors, warnings } = formatPreflightProblems(checkDependencies());
  if (errors.length) {
    for (const e of errors) console.error(e);
    process.exit(1);
  }
  for (const w of warnings) console.error(w);
  ```
  必要依賴缺 → 退出；選用依賴缺 → 警告後繼續。doctor 模式已先 return，不會跑到這裡。
- **HELP_TEXT**：在 Examples 或 Commands 區補一行說明 `port doctor` 會檢查依賴並回報狀態。

## 錯誤處理與邊界

- `commandExists` 對單一目錄的 `accessSync` 失敗（不存在、無權限）以 try/catch 視為「該目錄沒有」，繼續掃下一個，不拋出。
- `pathEnv` 為 `undefined` 或空字串 → 視為沒有任何路徑 → 所有命令回 `false`（preflight 會據此報錯，行為合理）。
- preflight 與 doctor 都只「檢查存在性」，不驗證版本或實際可執行性（YAGNI）。

## 測試

- **`commandExists`**：建立臨時目錄放一個 `chmod +x` 的檔案，以該目錄為 `pathEnv` → 偵測到；查一個不存在的命令名 → `false`；空 `pathEnv` → `false`。
- **`installHint`**：`'linux'` / `'darwin'` / 未知平台（fallback）三種輸出。
- **`checkDependencies`**：注入假 `existsFn`（例如只認得 `lsof`），驗證每個結果的 `found`、`required`、`hint` 正確。
- **`formatDoctorReport`**：全部存在、部分缺少 兩種情境的字串內容（含 ✓/✗ 與安裝行）。
- **`formatPreflightProblems`**：必要缺→`errors` 有值且 `warnings` 空；選用缺→`warnings` 有值且 `errors` 空；全 present→兩者皆空。

## 不做（YAGNI）

- 不檢查命令版本、不驗證實際執行結果。
- 不自動安裝、不提示 `sudo`。
- 不支援 Windows（沿用專案既有的 macOS/Linux 範圍）。
- doctor 不輸出 JSON 格式。
