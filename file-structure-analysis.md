# ファイル構成分析レポート

作成日: 2026-04-18

---

## 現状のファイル構成

```
client/src/
├── App.jsx              (176行) ← ソケット・全状態・部屋作成UIが混在
├── net/socket.js        (  7行) ← 接続初期化のみ
├── game/
│   ├── zones.js         (100行) ← ゾーン定義・永続化
│   └── adjacency.js     ( 43行) ← 隣接関係定義
└── ui/
    ├── ActionPanel.jsx           (396行) ← 最大ファイル
    ├── Board.jsx                 (281行)
    ├── TeamStatusPanel.jsx       ( 72行)
    ├── NeutralObjectivesPanel.jsx ( 71行)
    ├── StructurePanel.jsx        ( 64行)
    ├── ZoneEditor.jsx            ( 96行)
    ├── TurnLogPanel.jsx          ( 25行)
    └── styles.css                (499行)

server/
├── index.js             (111行)
└── rules/game.js        (890行) ← サーバー最大ファイル
```

---

## 他プロジェクトとの比較での異常点

### 問題あり：App.jsx が「3つの役割」を兼任している

一般的なReactゲームプロジェクトでは以下を分離するのが標準だが、現状は176行に詰め込まれている：

- ソケット接続の管理 → カスタムフック `useSocket.js`
- ゲーム状態の管理 → カスタムフック `useGameState.js` または Context
- 画面切り替えロジック → ルーティングまたは状態による条件分岐
- ロビー画面UI → `LobbyScreen.jsx` などの独立コンポーネント

ソケットイベントが追加されるたびに App.jsx が肥大化するリスクがある。

### 問題あり：ActionPanel.jsx (396行) が役割を多く担っている

5ロール × 4アクションタイプ（Move/Attack/Recall/Wait）の組み合わせ全てを1ファイルで処理。
`getAttackCandidates()` などのロジック関数も混在している。

### 問題なし：ui/下の小さなパネル群

TeamStatusPanel / NeutralObjectivesPanel / StructurePanel / TurnLogPanel は 25〜72行で適切なサイズ。

### 問題なし：game/下の構成

zones.js と adjacency.js は役割が明確で適切。

### サーバー側：game.js (890行) は許容範囲内

関数で整理されており、1ファイルでもドメインが一貫しているので現時点では許容範囲。

---

## 再レンダリング問題の現状と原因

### 現状の最適化状況

- `ZoneEditor.jsx` のみ `useMemo` を使用（1箇所のみ）
- `React.memo` / `useCallback` は**一切なし**

### 過去の「何もしなくても画面更新」問題の原因（推定）

1. Socket イベント受信 (`state:update`) → App.jsx の `state` 更新
2. `React.memo` なし → 全子コンポーネントが一斉に再描画
3. Board.jsx：全ゾーン（30マス）を毎回再生成
4. ActionPanel.jsx：`getAttackCandidates()` を毎レンダリング実行

---

## 分割・統合の推奨方針

**結論：部分的な分割が有効**（全体統合・現状維持より優先）

### 優先度 高：App.jsx の責務分離

```
client/src/
├── hooks/
│   ├── useGameSocket.js   ← ソケット接続・イベント管理
│   └── useGameState.js    ← 状態管理（useState群）
└── ui/
    └── LobbyScreen.jsx    ← 部屋作成・参加UIを切り出し
```

**効果：**
- ソケットのイベント追加が App.jsx に影響しなくなる
- 部屋作成画面の独立で、ログイン・マッチング機能追加時の改修が局所化
- テストが書きやすくなる

### 優先度 中：ActionPanel.jsx の分割

```
ui/ActionPanel/
├── ActionPanel.jsx       ← ターン確定ボタンのみのオーケストレーター
├── RoleActionInput.jsx   ← 1ロール分の入力UI（React.memo で包む）
├── MoveSelector.jsx      ← 移動先選択
├── AttackSelector.jsx    ← 攻撃対象選択（getAttackCandidates を useMemo化）
└── RecallOptions.jsx     ← リコール時の購入選択
```

**効果：**
- `React.memo(RoleActionInput)` でロール単位のメモ化が可能
- 1ロール変更時に他4ロールの再レンダリングが不要になる

### 優先度 低：Board.jsx の個別ゾーンメモ化

```
ui/Board.jsx      ← 構造は維持
└── BoardZone.jsx ← 個別マスを React.memo で包む
```

分割というよりサブコンポーネントの切り出し + メモ化。

### 将来：server/rules/game.js の分割

機能追加時に戦闘・ミニオン・構造物ロジックで分割を検討。今は現状維持で良い。

---

## 現状維持が適切なファイル一覧

| ファイル | 理由 |
|--------|------|
| TeamStatusPanel.jsx (72行) | 適切なサイズ |
| NeutralObjectivesPanel.jsx (71行) | 適切なサイズ |
| StructurePanel.jsx (64行) | 適切なサイズ |
| TurnLogPanel.jsx (25行) | 非常に小さく分割不要 |
| ZoneEditor.jsx (96行) | 適切なサイズ |
| net/socket.js (7行) | 十分シンプル |
| game/adjacency.js (43行) | 役割が明確 |
| game/zones.js (100行) | 役割が明確 |
| server/rules/game.js (890行) | 機能追加時に検討 |

---

## 優先度まとめ

| 優先度 | 変更内容 | 主な効果 |
|------|---------|---------|
| 高 | App.jsx → useGameSocket + LobbyScreen に分離 | ソケット追加時の影響範囲を限定・責務分離 |
| 中 | ActionPanel.jsx → RoleActionInput 等に分割 + useMemo | ロール単位メモ化で再描画抑制 |
| 低 | Board.jsx → BoardZone.jsx 切り出し + React.memo | マス単位メモ化 |
| 将来 | server/rules/game.js を機能別に分割 | 機能追加時の改修範囲局所化 |
