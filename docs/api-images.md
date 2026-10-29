# 画像 API（ID・更新時刻・画像取得）

画像を外部のツールや画面から扱うための API の仕様です。画像は **ID** で識別し、**画像ファイルの最終更新時刻**で更新状況を把握します。

## 画像 ID の性質

- ID は DB の `images.id` です。**一度作った画像の ID は、上書き保存しても変わりません。**
- 一方、画像のファイル名（`image_path` / `/uploads/xxx.png`）は、上書き保存のたびに別名になり、古いファイルは削除されます。ファイル名や URL を覚えず、**ID でやり取りしてください。**
- 画像のレコードを返す API は、どれも `id` を含みます。

## 更新時刻 `image_updated_at`

画像のレコードには、`image_updated_at` が付きます。

| 項目 | 内容 |
|---|---|
| 意味 | 画像ファイル自体の最終更新時刻（`public/uploads/` のファイルの更新時刻） |
| 形式 | ISO 8601（UTC）。例 `2026-10-29T15:15:36.039Z` |
| ファイルが無い場合 | `null` |
| 付く API | `GET /api/images`、`GET /api/image`、`POST /api/save` の返却 |

`updated_at`（DB の列）との違い:

| 項目 | `updated_at` | `image_updated_at` |
|---|---|---|
| 変わるタイミング | プロンプトやグループタグなどメタ情報の編集でも変わる | 画像ファイルが差し替わったときだけ変わる |
| 用途 | レコード自体の更新 | 画像の差し替え検知・キャッシュの判定 |

画像が変わったかを調べたいときは、`image_updated_at` を前回の値と比べてください。

## API 一覧

### `GET /api/images` 画像の一覧

- クエリ: `keyword`、`groupTag`、`sortBy`、`limit`（既定20）、`offset`（既定0）
- 返却: `{ success, groupTags, <一覧と総数> }`。一覧の各要素に `id` と `image_updated_at` を含みます。
- `groupTags` はグループタグ名と件数の集計で、ID はありません。
- 1ページの件数分、画像ファイルの更新時刻を読みます。

### `GET /api/image?id=83` 画像1件の詳細

- 返却: `{ success, data }`。`data` はレコード全項目（`id`、`image_path`、`created_at`、`updated_at`、`image_updated_at` など）です。
- 存在しない ID は 404、ID なしは 400。

### `GET /api/imageFile?id=83` ID 指定で画像を取得

- 返却: 画像の PNG バイナリ（`Content-Type: image/png`）。
- 上書き保存でファイル名が変わっても、**同じ ID で常に最新の画像**が返ります。
- ヘッダ: `Cache-Control: no-cache`、`Last-Modified`（`image_updated_at` と同じ時刻）。ブラウザや中継先が古い画像を使い続けないようにしています。
- 存在しない ID は 404（JSON）、ID なしは 400（JSON）。

### `POST /api/save` 画像の保存

- `id`（または `edit_id`）を付けると、そのレコードを上書き更新します（ID は不変）。付けなければ新規作成で、新しい ID が振られます。
- 返却の `data` に、保存後のレコード（`image_updated_at` を含む）が入ります。

## 使い方の例

```bash
# 画像の一覧（id と image_updated_at が各要素に入る）
curl 'http://localhost:3000/api/images?limit=20'

# ID 指定で最新の画像を保存する
curl -o 83.png 'http://localhost:3000/api/imageFile?id=83'

# 更新の有無を調べる（前回の image_updated_at と比べる）
curl 'http://localhost:3000/api/image?id=83'
```

## 関連ファイル

| ファイル | 役割 |
|---|---|
| `lib/imageModel.js` | `normalizeImageRecord` が `image_updated_at` を付与 |
| `public/api/images.mt.js` | 一覧 API |
| `public/api/image.mt.js` | 詳細 API |
| `public/api/imageFile.mt.js` | ID 指定の画像取得 API |
| `public/api/save.mt.js` | 保存・上書き API |
