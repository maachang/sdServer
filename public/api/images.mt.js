/**
 * 画像一覧取得 API
 * GET /api/images
 * query: keyword, limit, offset
 */
exports.handler = async function() {
    const imageModel = $loadLib('imageModel.js');

    const keyword = $request.getQuery('keyword', '');
    const groupTag = $request.getQuery('groupTag', '');
    const sortBy = $request.getQuery('sortBy', 'created_at');
    const limit = parseInt($request.getQuery('limit', '20'), 10) || 20;
    const offset = parseInt($request.getQuery('offset', '0'), 10) || 0;
    const action = $request.getQuery('action', '');

    try {
        // POST 等によるグループタグ更新アクション
        if (action === 'updateGroupTag') {
            const body = $request.body || {};
            const id = parseInt(body.id, 10);
            const tag = body.group_tag !== undefined ? body.group_tag : (body.groupTag || '');
            if (!id) {
                $response.status(400);
                return { success: false, error: 'IDが指定されていません' };
            }
            const updated = imageModel.updateGroupTag(id, tag);
            const groupTags = imageModel.getGroupTags();
            return {
                success: true,
                data: updated,
                groupTags,
                message: 'グループタグを更新しました'
            };
        }

        const result = imageModel.findImages({ keyword, groupTag, sortBy, limit, offset });
        const groupTags = imageModel.getGroupTags();
        return {
            success: true,
            groupTags,
            ...result
        };
    } catch (e) {
        $response.status(500);
        return {
            success: false,
            error: e.message
        };
    }
};
