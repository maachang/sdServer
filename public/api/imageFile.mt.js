/**
 * 画像ファイル取得 API（ID 指定）
 * GET /api/imageFile?id=123
 *
 * ID は上書き保存しても変わらないため、画像ファイル名（URL）が変わっても
 * ID さえ分かれば常に最新の画像バイナリを取得できる。
 */
exports.handler = async function() {
    const imageModel = $loadLib('imageModel.js');
    const fs = $require('fs');
    const path = $require('path');
    const id = parseInt($request.getQuery('id', '0'), 10);

    if (!id) {
        $response.status(400);
        return { success: false, error: 'IDが指定されていません' };
    }

    try {
        const item = imageModel.getImageById(id);
        if (!item || !item.image_path) {
            $response.status(404);
            return { success: false, error: '画像が見つかりません' };
        }
        // DB の値からディレクトリ指定を除き、uploads 配下のファイル名だけを使う
        const fullPath = path.join(process.cwd(), 'public', 'uploads', path.basename(item.image_path));
        if (!fs.existsSync(fullPath)) {
            $response.status(404);
            return { success: false, error: '画像ファイルが見つかりません' };
        }
        $response.contentType('image/png');
        // 上書きで中身が変わるため、常に最新を取得させる
        $response.header('Cache-Control', 'no-cache');
        if (item.image_updated_at) {
            $response.header('Last-Modified', new Date(item.image_updated_at).toUTCString());
        }
        return fs.readFileSync(fullPath);
    } catch (e) {
        $response.status(500);
        return { success: false, error: e.message };
    }
};
