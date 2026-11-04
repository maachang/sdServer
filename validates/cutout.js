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
    // クリーン出力（白背景）の画像か。true なら四方に白い余白を足して切り抜く（base64Data 指定時に使用。id 指定時は保存済みの値を使う）
    clean_output: {
        type: 'boolean',
        required: false,
        default: false
    },
    id: {
        type: 'int',
        required: false,
        default: null
    }
};
