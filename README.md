# オンライン将棋 (Online Shogi)

ブラウザで遊べるリアルタイム対戦将棋ゲームです。

A real-time multiplayer Shogi game playable in web browsers across multiple devices.

## 機能 (Features)

- ✅ **リアルタイム対戦** - Socket.IO による即座の同期
- ✅ **成り** - 駒の成り/成らない選択
- ✅ **待った** - 相手の承認が必要な手の取り消し
- ✅ **持ち駒** - 取った駒を盤上に打つ
- ✅ **王手検知** - 王手の自動検出
- ✅ **ドラッグ&ドロップ** - 直感的な駒の移動
- ✅ **モダン UI** - 美しいデザインとアニメーション

## セットアップ (Setup)

### 必要なもの (Requirements)

- Node.js (v14 以上)

### インストール (Installation)

1. 依存関係をインストール:

```bash
npm install
```

2. サーバーを起動:

```bash
npm start
```

3. ブラウザで開く:

```
http://localhost:3000
```

## 遊び方 (How to Play)

### ゲームの開始

1. **ホストプレイヤー**:

   - 「新しいゲームを作成」をクリック
   - 表示されたルームコードを相手に共有

2. **ゲストプレイヤー**:
   - ルームコードを入力
   - 「参加」をクリック

### ゲームルール

- **先手 (Sente)**: プレイヤー 1 が先攻
- **後手 (Gote)**: プレイヤー 2 が後攻
- **駒の移動**: ドラッグ&ドロップまたはクリックで移動
- **成り**: 敵陣に入った駒は成ることができます
- **持ち駒**: 取った駒をクリックして空いているマスに打てます
- **待った**: 相手のターン中に「待った」ボタンで取り消しを要求できます

### 駒の種類

| 駒  | 読み           | 英語   | 成駒      |
| --- | -------------- | ------ | --------- |
| 王  | 王将 (Ōshō)    | King   | -         |
| 飛  | 飛車 (Hisha)   | Rook   | 龍 (竜王) |
| 角  | 角行 (Kakugyō) | Bishop | 馬 (竜馬) |
| 金  | 金将 (Kinshō)  | Gold   | -         |
| 銀  | 銀将 (Ginshō)  | Silver | 成銀      |
| 桂  | 桂馬 (Keima)   | Knight | 成桂      |
| 香  | 香車 (Kyōsha)  | Lance  | 成香      |
| 歩  | 歩兵 (Fuhyō)   | Pawn   | と (と金) |

## 技術スタック (Tech Stack)

- **Backend**: Node.js + Express + Socket.IO
- **Frontend**: HTML5 + CSS3 + Vanilla JavaScript
- **Real-time**: Socket.IO for bidirectional communication

## 開発 (Development)

### プロジェクト構造

```
shogi/
├── server.js          # ゲームサーバー
├── package.json       # 依存関係
├── public/
│   ├── index.html    # メインHTML
│   ├── styles.css    # スタイルシート
│   └── client.js     # クライアントロジック
└── README.md
```

### ポート変更

デフォルトポートは 3000 です。変更する場合:

```bash
PORT=8080 npm start
```

## ライセンス (License)

MIT License

---

楽しい対局を！ Enjoy your game!
