# port-cli — 在 port 清單顯示專案來源

**日期**：2026-06-17
**狀態**：設計完成，待實作

## 問題

執行 `port` 時，清單只顯示 generic 的 process 名稱，例如：

```
[PID 1234] node :8000 (ben)
```

使用者看到 `node :8000` 無法判斷實際上是哪個專案在跑（多個 node dev server 同時開時尤其困擾）。

## 目標

在清單中補上足以辨識專案的資訊：每個 process 的**工作目錄 (cwd)** 與**完整啟動指令 (command)**。

- cwd 通常就是專案根目錄，其 basename 即「專案名」。
- command 顯示實際跑的 script / 工具（如 `next dev`、`node server.js`）。

## 技術路線

統一使用 `lsof` 與 `ps`，跨 macOS/Linux 行為一致，整個列表只多兩次 subprocess 呼叫：

- **cwd**：`lsof -a -p <pid清單> -d cwd -F pn`，一次抓全部 process 的 cwd。
- **command**：`ps -p <pid清單> -o pid=,command=`，一次抓全部 process 的完整指令。

（評估過 Linux 直接 readlink `/proc/<pid>/cwd` 的替代方案，效能略好但需分平台維護兩條程式路徑；對通常 < 50 個 process 的列表效能差異可忽略，故不採用。）

## 架構

新增模組 `src/enrich.js`，單一職責：把基本 entry 補上 `cwd`、`command`、`project`。

```
src/lsof.js     → [{ pid, name, user, port }]
src/enrich.js   → 補上 { cwd, command, project }   ← 新增
src/index.js    → getLsofEntries() 後呼叫 enrichEntries()，再進選單
src/fuzzy.js    → entryToString 納入新欄位，支援用專案名搜尋
```

### `src/enrich.js`

匯出函式：

- `parsePsOutput(raw)` → `Map<pid, command>`：解析 `ps -o pid=,command=` 輸出（每行 `  1234 node /path/server.js`，trim 後第一段是 pid，其餘是 command）。
- `parseCwdOutput(raw)` → `Map<pid, cwd>`：解析 lsof `-F pn` 輸出（`p<pid>` 切換目前 pid，`n<path>` 為該 pid 的 cwd）。
- `getCommands(pids)` → `Map<pid, command>`：執行 `ps`，失敗回傳空 Map。
- `getCwds(pids)` → `Map<pid, cwd>`：執行 `lsof`，失敗回傳空 Map。
- `enrichEntries(entries)` → 在每個 entry 上回填：
  - `cwd`：取自 cwd map，缺則 `null`
  - `command`：取自 command map，缺則 `null`
  - `project`：`cwd ? basename(cwd) : null`

所有 subprocess 用 `execFileSync`（避免 shell injection，與既有程式一致）。

### Graceful degradation

任何 pid 抓不到 cwd 或 command（權限不足、process 剛結束、平台差異），對應欄位留 `null`，**絕不讓列表壞掉或拋錯**。`getCommands`/`getCwds` 整體失敗時回傳空 Map，列表退回原本只有 pid/name/port/user 的行為。

## 顯示

集中在純函式以利測試（放 `src/enrich.js` 或 `src/index.js` 的 helper）：

- **inline 名稱**（清單每行）：`[PID 1234] node :8000 (ben) — my-app`
  - 有 `project` 才附加 ` — <project>`，否則維持原樣。
- **description**（選取項目下方）：`~/code/my-app · next dev`
  - home 目錄縮寫成 `~`。
  - 只有 cwd → 顯示縮寫後的 cwd；只有 command → 顯示 command；cwd 與 command 用 ` · ` 連接；兩者皆無 → 不提供 description。
- **單一 port 模式**（`port 3000`）：每個 process 在原行下方多印一行
  `  ↳ ~/code/my-app · next dev`（同 description 規則；無內容則不印）。

### 互動清單實作

`index.js` 的 `search` source 回傳的 choice：

```js
{
  name: inlineLabel(e),          // [PID ...] ... — project
  value: e,
  description: detailLine(e),    // ~/code/my-app · next dev（可為 undefined）
}
```

## 搜尋

`src/fuzzy.js` 的 `entryToString` 由：

```
`${pid} ${name} ${port} ${user}`
```

擴充為納入 `cwd`、`command`、`project`（皆可能為 null，組字串時略過），使 `port --filter my-app` 與選單內輸入專案名都能命中。

## 測試

- **`enrich.js`**
  - `parsePsOutput` / `parseCwdOutput`：正常輸出、空輸出、多 pid。
  - `enrichEntries`：回填正確、`project` 為 basename、缺 cwd/command 時降級為 `null`。
- **顯示純函式**：`inlineLabel`（有/無 project）、`detailLine`（只有 cwd / 只有 command / 兩者 / 皆無）、`~` 縮寫。
- **`fuzzy.js`**：可用 project 名稱配對到對應 entry。

## 不做（YAGNI）

- 不偵測 framework 類型、不解析 package.json 名稱（cwd basename 已足夠辨識）。
- 不快取、不背景刷新。
- 不改變 kill 流程與 exit code。
