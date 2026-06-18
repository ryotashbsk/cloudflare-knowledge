# Cloudflare Pages ベーシック認証の設定方法

## ファイル構成

```text
functions/
  _middleware.ts
```

`functions/_middleware.ts` は Cloudflare Pages Functions の middleware として動作する。  
Pages にデプロイすると、すべてのリクエストがこの middleware を通る。


## 使い方

Cloudflare Pages の環境変数に以下を設定する。

| 変数名 | 値 | 説明 |
| --- | --- | --- |
| `BASIC_AUTH_ENABLED` | `1` | BASIC 認証を有効化する。`1` 以外の場合は認証をスキップする。 |
| `BASIC_AUTH_USER` | 任意のユーザー名 | BASIC 認証のユーザー名。 |
| `BASIC_AUTH_PASSWORD` | 任意のパスワード | BASIC 認証のパスワード。 |

Preview 環境だけで有効化したい場合は、Cloudflare Pages の環境変数を Preview 用に設定し、  
Production では `BASIC_AUTH_ENABLED` を設定しない、または `1` 以外にする。

