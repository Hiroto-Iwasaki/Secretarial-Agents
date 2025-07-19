# Secretarial-Agents Backend

このディレクトリは「Secretarial-Agents」プロジェクトのバックエンドAPIサーバ用です。

---

## 構成・設計方針
- Node.js + Express によるシンプル・拡張性重視のAPIサーバ
- フロントエンドからのAIサービス選択肢・モデル情報の提供
- APIキーなどの機密情報は`.env`で安全に管理
- モデル名や候補リストは`config/models.json`でバージョン管理
- 単一責任原則（SRP）を厳守

---

## ディレクトリ構成

- `server.js` : メインAPIサーバ
- `config/models.json` : 各AIサービスごとのモデル構成情報
- `.env` : APIキーなどの機密情報（Git管理除外）

---

## .envサンプル
```
# OpenAI API
OPENAI_API_KEY=sk-xxxx...
```

---

## models.jsonサンプル
```
{
  "openai": {
    "default": "gpt-4.1-mini",
    "candidates": ["gpt-4.1-mini", "gpt-4o", "gpt-3.5-turbo"]
  }
}
```

---

## 主なAPI

- `GET /api/available-ais`
    - 利用可能なAI種別リスト（ais）
    - モデル構成情報（models）
    - 例:
    ```json
    {
      "ais": { ... },
      "models": { ... }
    }
    ```

---

## 開発・運用メモ
- `.env`は必ずGit管理除外すること
- モデル追加・削除は`models.json`編集でOK
- サーバー再起動で反映
- APIキー有無でAIリスト返却内容を分岐可能

---

ご質問・要望はプロジェクト管理者まで。
