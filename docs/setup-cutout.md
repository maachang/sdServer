# 背景透過（AI 切り抜き）のセットアップ

生成画面の「✂️ 背景を透過する」ボタン（`POST /api/cutout`）は、Python の AI 切り抜きモデル（rembg の BiRefNet）を使います。
Bun だけで動く他の機能と異なり、**外部依存（Python 仮想環境とモデルファイル）のセットアップが必要**です。
セットアップしていない環境では、透過ボタンを押すとエラーになります（画像生成など他の機能には影響しません）。

## 必要なもの

| 項目 | 内容 |
|---|---|
| Python | 3.x（`python3` コマンドと `venv` モジュール） |
| ディスク | 仮想環境 約590MB ＋ モデル 約224MB |
| ネットワーク | セットアップ時のみ必要（pip と Hugging Face / GitHub からのモデル取得） |
| CPU / メモリ | GPU 不要。CPU のみで動作 |

Debian / Ubuntu 系で `venv` が無い場合:

```bash
sudo apt install python3 python3-venv
```

## セットアップ手順

プロジェクト直下で実行します。

```bash
scripts/setup_rembg.sh
```

スクリプトが行うこと:

1. `scripts/rembg_venv/` に Python 仮想環境を作成
2. `rembg[cpu]`（onnxruntime を含む）をインストール
3. モデル `birefnet-general-lite`（約224MB）を `data/rembg/` にダウンロード
4. 最後に「セットアップ完了」と表示

完了後、サーバーの再起動は不要です（次の透過リクエストから使われます）。

## 生成されるもの（Git 管理外）

| パス | 内容 |
|---|---|
| `scripts/rembg_venv/` | Python 仮想環境（`.gitignore` 済み） |
| `scripts/__pycache__/` | Python のキャッシュ（`.gitignore` 済み） |
| `data/rembg/` | モデルファイル（`U2NET_HOME` として実行時に参照） |

`data/` 配下は DB と同じく環境ごとのデータ置き場です。本番・開発のそれぞれでセットアップを実行してください。

## 動作確認

```bash
# 任意の PNG で単体実行
U2NET_HOME="$PWD/data/rembg" scripts/rembg_venv/bin/python scripts/rembg_cutout.py 入力.png -o /tmp/out.png
```

- 成功すると `out.png` に透過 PNG ができます（512×512 で約27秒。モデル読み込み約8秒＋推論約18秒）。
- 終了コード `3` は「すでに透過済みの画像」（透明画素が全体の0.5%以上）で、処理せず拒否した状態です。

画面からは、画像生成後または保存済み画像の編集画面で「✂️ 背景を透過する」を押し、市松模様のプレビューが出れば正常です。

## 本番環境（Nginx 構成）での注意

- Bun を実行するユーザーが `scripts/rembg_venv/` と `data/rembg/` を読める必要があります。セットアップは**そのユーザーで**実行してください。
- 実行中は一時ファイルを OS の一時ディレクトリに作ります。書き込み不可だと失敗します。
- 透過処理は同時実行を直列化しています（CPU 負荷を抑えるため）。複数人が同時に押すと順番待ちになり、1件あたり約27秒かかります。
- 処理のタイムアウトは 180 秒です。Nginx の `proxy_read_timeout` が短い場合は、60秒以上に設定してください（Nginx の既定は 60 秒で、通常は足ります）。

## トラブルシューティング

| 症状 | 原因と対処 |
|---|---|
| 「背景の透過処理に失敗しました」＋ `No such file` 系 | `scripts/rembg_venv` が無い。`scripts/setup_rembg.sh` を実行 |
| モデルのダウンロードで失敗する | ネットワーク制限（プロキシ等）。許可後に `scripts/setup_rembg.sh` を再実行（取得済みの部分は再利用） |
| `ensurepip is not available` / `venv` が作れない | `python3-venv` が未導入。`sudo apt install python3-venv` |
| 「この画像はすでに透過済みです」 | 仕様。透明画素が0.5%以上ある画像は処理すると壊れるため拒否 |
| 初回だけ極端に遅い | OS のファイルキャッシュが冷えている。2回目以降は約27秒 |
| タイムアウト（180秒） | CPU が非常に遅い、または他の重い処理と競合。負荷を下げて再試行 |

## 関連ファイル

| ファイル | 役割 |
|---|---|
| `scripts/setup_rembg.sh` | セットアップスクリプト |
| `scripts/rembg_cutout.py` | 切り抜き本体（BiRefNet、透過済み判定、境界色の補正） |
| `scripts/bleed_transparent_rgb.py` | 透明部の RGB を近傍の不透明色で埋める |
| `lib/cutout.js` | Python の起動・直列化・タイムアウト管理 |
| `public/api/cutout.mt.js` | `POST /api/cutout`（プレビュー用。保存はしない） |
| `validates/cutout.js` | リクエストの検証定義 |

仕様の詳細は `.claude/CLAUDE.md` の「7. クリーン出力（白単色背景）と背景の透過」を参照してください。
