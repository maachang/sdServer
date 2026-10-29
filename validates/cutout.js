/**
 * 背景の透過 API (/api/cutout) のバリデーション定義
 * ※ base64Data（未保存の生成画像）か id（保存済み画像）のどちらか一方が必須（ハンドラ側で判定）
 */
module.exports = {
    base64Data: {
        type: 'string',
        required: false,
        maxLen: 40000000,
        default: ''
    },
    id: {
        type: 'int',
        required: false,
        default: null
    }
};
