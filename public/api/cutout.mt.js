/**
 * 背景の透過 API（AI 切り抜きモデル）
 * POST /api/cutout
 * body: { base64Data: "PNGのbase64" } または { id: 保存済み画像ID }
 * 戻り値: { success, base64Data, imageDataUrl }（背景を透過した PNG。保存はしない＝プレビュー用）
 */
exports.handler = async function() {
    const fs = $require('fs');
    const path = $require('path');
    const validate = $loadLib('validate.js');
    const cutout = $loadLib('cutout.js');
    const imageModel = $loadLib('imageModel.js');
    const schema = $loadLib('validates/cutout.js');

    if ($request.method !== 'POST') {
        $response.status(405);
        return { success: false, error: 'Method Not Allowed' };
    }

    let body = $request.body || {};
    if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch (e) { body = {}; }
    }

    const checkResult = validate.check(body, schema);
    if (!checkResult.valid) {
        $response.status(400);
        return { success: false, errors: checkResult.errors };
    }
    const params = checkResult.data;

    try {
        let srcBuffer;
        if (params.base64Data) {
            // 未保存の生成画像（data URL 接頭辞が付いていても受け付ける）
            srcBuffer = Buffer.from(params.base64Data.replace(/^data:image\/png;base64,/, ''), 'base64');
        } else if (params.id) {
            // 保存済み画像（uploads 配下のファイルのみ）
            const item = imageModel.getImageById(params.id);
            if (!item || !item.image_path) {
                $response.status(404);
                return { success: false, error: '画像が見つかりません' };
            }
            const filePath = path.join(process.cwd(), 'public', 'uploads', path.basename(item.image_path));
            if (!fs.existsSync(filePath)) {
                $response.status(404);
                return { success: false, error: '画像ファイルが見つかりません' };
            }
            srcBuffer = fs.readFileSync(filePath);
        } else {
            $response.status(400);
            return { success: false, error: 'base64Data または id を指定してください' };
        }

        const outBuffer = await cutout.removeBackground(srcBuffer);
        const outBase64 = outBuffer.toString('base64');

        return {
            success: true,
            base64Data: outBase64,
            imageDataUrl: `data:image/png;base64,${outBase64}`
        };
    } catch (e) {
        $response.status(500);
        return { success: false, error: e.message };
    }
};
