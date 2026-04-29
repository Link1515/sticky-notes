# AGENTS.md

本檔案是給 Codex 與其他程式代理使用的專案開發指令。請在每次開始任務前先閱讀本檔案，並依照這裡的架構、限制、驗收標準與工作流程執行。

## 專案目標

建立一個使用 Tauri 的跨平台桌面便利貼應用程式。使用者可以在桌面上新增多張便利貼，任意拖動便利貼位置，編輯內容、調整大小、變更顏色，並在下次啟動或開機自動啟動後恢復先前所有便利貼狀態。

核心體驗應接近桌面原生便利貼，而不是一般網頁待辦清單：

- 每張便利貼看起來像獨立浮動的桌面貼紙。
- 使用者可以拖動便利貼到桌面任意位置。
- 每張便利貼的位置、大小、顏色、內容、釘選狀態與可見性都要持久保存。
- 關閉應用程式後再次啟動，必須載入所有先前建立的便利貼。
- 支援 Windows、macOS、Linux。
- 預設使用 Tauri v2。

## 建議技術棧

優先採用以下組合，除非使用者明確要求更換：

- Tauri v2
- Rust backend
- TypeScript
- Vue 3
- Vite
- Pinia，若需要跨元件共享狀態
- Tailwind CSS
- Tauri 官方 plugin 為優先選項
- 單機本機資料保存，預設不做雲端同步

建議 plugin：

- `@tauri-apps/plugin-store`：保存使用者偏好、小型 JSON 狀態與便利貼資料的簡單版本。
- `@tauri-apps/plugin-sql`：當便利貼資料需要查詢、版本遷移、歷史紀錄或未來同步時，改用 SQLite。
- `@tauri-apps/plugin-autostart`：支援系統開機自動啟動。
- `@tauri-apps/plugin-window-state`：保存主視窗或輔助視窗狀態。
- `@tauri-apps/plugin-single-instance`：避免使用者重複啟動多個 app instance。

如果專案只是 MVP，優先用 Store；如果開始加入搜尋、標籤、歷史版本、回收桶或同步，改用 SQLite。

## 必須先釐清的產品決策

若任務需要實作而需求尚未明確，請先提出你的假設並直接採用合理預設，不要停住等待使用者回答，除非該決策會造成破壞性後果。

預設產品決策如下：

1. App 本身只有一個主 process。
2. 所有便利貼資料由主視窗或 backend 統一管理。
3. 每張便利貼在前端以可拖曳 floating note component 呈現；MVP 不強制每張便利貼都是獨立 native window。
4. 若使用者要求「每張便利貼像桌面視窗一樣獨立存在」，才改成每張便利貼建立獨立 Tauri WebviewWindow。
5. 拖曳位置以螢幕座標或 app viewport 座標保存；必須處理多螢幕、解析度改變與超出可視範圍的情況。
6. 預設啟用自動保存，不需要使用者手動按儲存。
7. 開機自動啟動必須是可開關設定，不可強制啟用。
8. 預設不收集 telemetry。
9. 預設資料只存在本機。

## 功能需求

### 便利貼 CRUD

必須支援：

- 新增便利貼
- 編輯文字內容
- 刪除便利貼
- 復原刪除，若已實作回收桶
- 調整顏色
- 調整字體大小，至少支援小、中、大
- 拖曳位置
- 調整大小
- 置頂或取消置頂，若平台支援
- 顯示或隱藏所有便利貼

每張便利貼至少包含以下資料欄位：

```ts
type StickyNote = {
  id: string;
  content: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  fontSize: 'sm' | 'md' | 'lg';
  isPinned: boolean;
  isVisible: boolean;
  zIndex: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
};
```

### 持久化

便利貼資料必須保存到本機資料目錄，不可只存在 Vue reactive state 或 Pinia store。

最低要求：

- App 啟動時載入所有未刪除便利貼。
- 使用者編輯內容後自動保存。
- 使用者拖動或 resize 後自動保存。
- 寫入需 debounce，避免每個 keystroke 都立即落盤。
- 儲存失敗時必須有錯誤處理，不可靜默失敗。
- 若資料檔損毀，應保留備份或提供 fallback，不可讓 app 無法啟動。

建議保存策略：

- MVP：Store plugin，保存成 `sticky-notes.json`。
- 正式版：SQLite，資料表 `notes`、`settings`、`note_history`。

### 開機與啟動行為

必須支援：

- 使用者可在設定中開啟或關閉「開機自動啟動」。
- App 啟動後自動載入先前便利貼。
- 若啟動時發現部分便利貼位置已超出目前螢幕可視區，需自動移回可視範圍。
- 若已經有 app instance 在執行，第二次啟動應聚焦現有 instance，而不是開另一組便利貼。

不要在未經使用者同意時自動註冊開機啟動。

### 視窗與拖曳

MVP 可以採用單一透明或一般主視窗承載多張便利貼。如果之後改成 native multi-window，需遵守以下原則：

- 每張便利貼的 native window label 必須穩定且可由 note id 推導，例如 `note-${id}`。
- 建立 window 前先檢查是否已存在。
- 每張 window 的位置與大小必須由 note state 還原。
- 關閉單張便利貼 window 不代表刪除資料，除非 UI 明確表示「刪除」。
- 避免同一張 note 產生重複 window。

拖曳實作需注意：

- 拖曳只應由便利貼 header 或明確 drag handle 觸發。
- 編輯文字時不能誤觸拖曳。
- 拖曳結束後再保存位置，不要在每個 mousemove 同步寫入磁碟。
- 多螢幕環境需避免座標錯亂。

### UI/UX

基本 UI 要求：

- 便利貼外觀簡潔，接近紙張或卡片。
- 每張便利貼有 header/toolbar，但不要過度佔空間。
- 支援快捷新增。
- 支援鍵盤輸入與常見快捷鍵。
- 刪除前若不可復原，必須確認。
- 空狀態需要明確引導使用者新增第一張便利貼。
- 顏色選項應有限制，避免任意 color picker 造成可讀性問題。

建議快捷鍵：

- `Cmd/Ctrl + N`：新增便利貼
- `Cmd/Ctrl + W`：隱藏目前便利貼或關閉目前編輯焦點
- `Esc`：取消選取或關閉浮動選單

### 設定

至少支援：

```ts
type AppSettings = {
  launchAtStartup: boolean;
  showOnStartup: boolean;
  defaultNoteColor: string;
  defaultNoteWidth: number;
  defaultNoteHeight: number;
  autosaveDebounceMs: number;
  theme: 'system' | 'light' | 'dark';
};
```

預設值：

```ts
const defaultSettings: AppSettings = {
  launchAtStartup: false,
  showOnStartup: true,
  defaultNoteColor: 'yellow',
  defaultNoteWidth: 260,
  defaultNoteHeight: 220,
  autosaveDebounceMs: 500,
  theme: 'system',
};
```

## 建議 repo 結構

若是從零開始建立專案，請使用以下結構：

```txt
.
├── AGENTS.md
├── README.md
├── package.json
├── pnpm-lock.yaml
├── src/
│   ├── app/
│   │   ├── App.vue
│   │   ├── router.ts
│   │   └── providers.ts
│   ├── components/
│   │   ├── StickyNote/
│   │   │   ├── StickyNote.vue
│   │   │   ├── StickyNoteToolbar.vue
│   │   │   └── sticky-note.css
│   │   ├── NoteCanvas/
│   │   │   └── NoteCanvas.vue
│   │   └── SettingsPanel/
│   │       └── SettingsPanel.vue
│   ├── features/
│   │   ├── notes/
│   │   │   ├── notesStore.ts
│   │   │   ├── notesRepository.ts
│   │   │   ├── notesTypes.ts
│   │   │   └── notesPersistence.ts
│   │   └── settings/
│   │       ├── settingsStore.ts
│   │       └── settingsRepository.ts
│   ├── composables/
│   ├── lib/
│   │   ├── debounce.ts
│   │   ├── ids.ts
│   │   ├── platform.ts
│   │   └── screenBounds.ts
│   ├── styles/
│   └── main.ts
├── src-tauri/
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   ├── capabilities/
│   └── src/
│       ├── lib.rs
│       ├── main.rs
│       ├── commands/
│       ├── notes/
│       └── settings/
└── tests/
    ├── unit/
    └── e2e/
```

若專案已存在，請不要強行重構成上述結構；先遵守現有風格，再逐步改善。

## 開發指令

請優先使用專案目前的 package manager。若無法判斷，預設使用 pnpm。

常用指令：

```bash
pnpm install
pnpm dev
pnpm tauri dev
pnpm build
pnpm tauri build
pnpm lint
pnpm test
pnpm typecheck
```

Rust 端常用指令：

```bash
cd src-tauri
cargo fmt
cargo clippy -- -D warnings
cargo test
```

在提交或交付前，至少執行：

```bash
pnpm typecheck
pnpm lint
pnpm test
cd src-tauri && cargo fmt --check && cargo clippy -- -D warnings && cargo test
```

如果專案還沒有這些 scripts，請新增合理 scripts，並在 README 說明。

## 程式碼規範

### TypeScript/Vue

- 使用 TypeScript strict mode。
- 不要使用 `any`，除非有註解說明原因。
- Vue Single File Component 應小而明確，避免單一檔案超過 300 行。
- 優先使用 Vue 3 Composition API 與 `<script setup lang="ts">`。
- 跨元件共享狀態優先使用 Pinia；僅限單一 component 的互動狀態才放在本地 reactive/ref。
- 狀態管理需清楚區分 UI state 與 persisted domain state。
- 資料保存邏輯不可散落在 component 中，請集中於 repository/persistence layer。
- 所有跨 Tauri API 呼叫都要包在 adapter/repository 中，避免 Vue component 直接依賴 plugin 細節。
- 對會頻繁觸發的事件，例如 typing、dragging、resizing，必須 debounce 或 throttle。

### Rust/Tauri

- Rust code 必須通過 `cargo fmt`。
- 避免 `unwrap()` 與 `expect()` 出現在 runtime path；測試可以例外。
- Tauri command 回傳明確的 Result 型別。
- 錯誤需轉成前端可理解的 domain error。
- 權限設定採最小權限原則，不要一次開過大的 filesystem scope。
- 不要把便利貼內容寫入 log。

### Vue/CSS/UI

- 便利貼需可讀、可操作、可 resize。
- 顏色對比要足夠。
- 拖曳區與文字編輯區要明確分離。
- 不要讓 toolbar 按鈕在小尺寸便利貼中擠壓文字區。
- 支援系統深色模式。

## 資料模型與保存策略

### Store-based MVP

Store file 建議：

```txt
app-data/sticky-notes.json
```

建議內容：

```ts
type PersistedState = {
  version: number;
  notes: StickyNote[];
  settings: AppSettings;
  lastSavedAt: string;
};
```

保存要求：

- 每次寫入前驗證 schema。
- 每次 app 啟動時執行 migration。
- 寫入前可先保存 `.bak`。
- 若主檔案讀取失敗，嘗試讀取 backup。

### SQLite 正式版

若改用 SQLite，建議 schema：

```sql
CREATE TABLE notes (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  x REAL NOT NULL,
  y REAL NOT NULL,
  width REAL NOT NULL,
  height REAL NOT NULL,
  color TEXT NOT NULL,
  font_size TEXT NOT NULL,
  is_pinned INTEGER NOT NULL DEFAULT 0,
  is_visible INTEGER NOT NULL DEFAULT 1,
  z_index INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

資料遷移必須版本化，不可手動假設使用者永遠從最新版開始。

## 安全與隱私

- 便利貼內容可能包含敏感資訊，不可上傳到第三方服務。
- 不要加入 telemetry、analytics、crash reporting，除非使用者明確要求。
- 不要把 note content 寫進 console log、Rust log、error report 或測試 snapshot。
- 本機資料應存放於 app data/config directory，不要存在專案目錄或暫存目錄。
- 檔案權限與 Tauri capability 必須最小化。

## 跨平台注意事項

### Windows

- 測試拖曳、resize、DPI scaling。
- 注意多螢幕座標與 scaling。
- 自動啟動需可關閉。

### macOS

- 注意視窗層級、置頂、Mission Control 行為。
- 自動啟動需使用平台允許的方式。
- 若使用透明視窗，測試陰影與滑鼠事件穿透。

### Linux

- Wayland 與 X11 行為可能不同。
- always-on-top、透明視窗、桌面層級可能依桌面環境而異。
- 不要假設所有 Linux 桌面都支援相同 window manager 功能。

## 任務執行流程

Codex 在執行任何開發任務時請遵守：

1. 先閱讀 `AGENTS.md`、`README.md`、`package.json`、`src-tauri/Cargo.toml`、`src-tauri/tauri.conf.json`。
2. 判斷目前專案是新建、MVP、還是已有架構。
3. 優先做最小可驗證修改，不要一次重寫整個 app。
4. 修改前簡述計畫。
5. 修改時保持 frontend/backend 邊界清楚。
6. 修改後執行可用的 typecheck、lint、test、cargo 檢查。
7. 若檢查失敗，優先修復；若無法修復，清楚列出原因與下一步。
8. 交付時列出變更檔案、驗證結果與尚未完成事項。

## 不要做的事

- 不要把所有邏輯塞進 `App.vue`。
- 不要用 localStorage 作為最終持久化方案；Tauri app 應使用 app data 目錄或 SQLite。
- 不要在每次 keypress 都同步寫入磁碟。
- 不要在未經使用者同意時啟用開機自動啟動。
- 不要新增雲端同步、帳號系統或後端服務，除非使用者明確要求。
- 不要過度設計 plugin system。
- 不要把 note content 放進 log。
- 不要假設單螢幕。
- 不要忽略 Linux window manager 差異。
- 不要新增大型 UI framework，除非現有專案已採用；Vue 專案可優先使用原生 SFC 與少量自製元件。

## MVP 驗收標準

MVP 完成需符合：

- 使用者可以新增便利貼。
- 使用者可以編輯便利貼文字。
- 使用者可以拖曳便利貼。
- 使用者可以調整便利貼大小。
- 使用者可以刪除便利貼。
- App 重新啟動後，便利貼內容、位置、大小、顏色仍存在。
- 設定中可開關開機自動啟動。
- 防止同時開啟多個 instance。
- TypeScript typecheck 通過。
- Rust fmt/clippy/test 通過，或清楚記錄未通過原因。

## 建議開發里程碑

### Milestone 1：專案初始化

- 建立 Tauri v2 + Vue 3 + TypeScript + Vite 專案。
- 建立基本視窗與主畫面。
- 設定 lint、typecheck、test。
- 建立資料型別。

### Milestone 2：便利貼 MVP

- 新增、編輯、刪除便利貼。
- 拖曳與 resize。
- 基本顏色選擇。
- Vue reactive state 或 Pinia store 管理。

### Milestone 3：本機持久化

- 接入 Store 或 SQLite。
- 啟動時載入資料。
- debounce autosave。
- schema migration。
- backup/fallback。

### Milestone 4：桌面整合

- Autostart 設定。
- Single instance。
- Window state。
- 多螢幕位置修正。

### Milestone 5：跨平台打包

- Windows build。
- macOS build。
- Linux build。
- README 補齊安裝與疑難排解。

## 測試要求

至少加入以下測試：

### Unit tests

- 新增 note 時產生完整預設欄位。
- 更新 note content 後 `updatedAt` 改變。
- 刪除 note 不會破壞其他 notes。
- 超出螢幕的 note position 會被 clamp 回可視區。
- settings merge 使用 default fallback。
- migration 可從舊版本資料升級。

### Integration tests

- 啟動時從 persistence 載入 notes。
- autosave debounce 正常運作。
- 儲存失敗時 UI 可收到錯誤狀態。

### Manual QA

- Windows：新增、拖曳、重啟、開機啟動。
- macOS：新增、拖曳、重啟、開機啟動。
- Linux：至少測試一個主流桌面環境。
- 多螢幕：移除第二螢幕後，便利貼不應消失在畫面外。

## 錯誤處理

前端需呈現可理解錯誤：

- 無法載入便利貼資料。
- 無法保存便利貼資料。
- 無法啟用開機自動啟動。
- 資料檔損毀但已從備份恢復。

Rust/backend 錯誤應轉成穩定 error code，例如：

```ts
type AppErrorCode =
  | 'NOTES_LOAD_FAILED'
  | 'NOTES_SAVE_FAILED'
  | 'SETTINGS_LOAD_FAILED'
  | 'SETTINGS_SAVE_FAILED'
  | 'AUTOSTART_ENABLE_FAILED'
  | 'AUTOSTART_DISABLE_FAILED'
  | 'UNKNOWN_ERROR';
```

## 交付格式

Codex 完成任務時，回覆需包含：

```txt
Summary
- ...

Changed Files
- ...

Validation
- [pass/fail/not run] pnpm typecheck
- [pass/fail/not run] pnpm lint
- [pass/fail/not run] pnpm test
- [pass/fail/not run] cargo fmt --check
- [pass/fail/not run] cargo clippy -- -D warnings
- [pass/fail/not run] cargo test

Notes / Follow-ups
- ...
```

不可只說「已完成」而不列出驗證結果。
