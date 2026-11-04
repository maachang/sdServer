/**
 * 背景の切り抜き（透過）
 *
 * AI 切り抜きモデル (BiRefNet / rembg) を Python で実行し、画像の背景を透過した PNG を生成する。
 * 背景の色や種類に依存せず、被写体の形から切り抜く（生成済みの画像・マゼンタ背景以外の画像も対象）。
 *
 * 実行要件: scripts/setup_rembg.sh によるセットアップ済みであること
 *   （scripts/rembg_venv の Python 仮想環境 + data/rembg のモデル）
 */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const SCRIPT_PATH = path.join(process.cwd(), 'scripts', 'rembg_cutout.py');
const VENV_PYTHON = path.join(process.cwd(), 'scripts', 'rembg_venv', 'bin', 'python');
const MODEL_HOME = path.join(process.cwd(), 'data', 'rembg');

// 処理のタイムアウト(ms)。CPU 実行では 512×512 で約20秒（モデル読み込み込み）
const TIMEOUT_MS = 180000;

// 同時実行を直列化（モデルが CPU を使い切るため、並列にすると全体が遅くなる）
let queue = Promise.resolve();

// クリーン出力（白背景）の画像を切り抜く際に、四方へ足す白い余白の幅(px)。
// 被写体が画像の端まで続くと誤って透過されるため、白を足して端から離す（処理後は元の大きさへ戻す）。
// ※ 画像230での試験: 10px は不足・40px でも抜けが残り、100px でほぼ正しく切り抜けた
const CLEAN_PAD_PX = 100;

async function runCutout(pngBuffer, cleanOutput) {
    if (!fs.existsSync(VENV_PYTHON)) {
        throw new Error('切り抜き環境が未セットアップです（scripts/setup_rembg.sh を実行してください）');
    }

    const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sdCutout-'));
    const inPath = path.join(workDir, 'in.png');
    const outPath = path.join(workDir, 'out.png');

    try {
        fs.writeFileSync(inPath, pngBuffer);

        await new Promise((resolve, reject) => {
            const proc = spawn(VENV_PYTHON, [SCRIPT_PATH, inPath, '-o', outPath, ...(cleanOutput ? ['--pad', String(CLEAN_PAD_PX)] : [])], {
                cwd: path.dirname(SCRIPT_PATH),
                env: { ...process.env, U2NET_HOME: MODEL_HOME }
            });
            let stderr = '';
            proc.stderr.on('data', (d) => { stderr += d.toString(); });

            const timer = setTimeout(() => {
                proc.kill('SIGKILL');
                reject(new Error('背景の透過処理がタイムアウトしました'));
            }, TIMEOUT_MS);

            proc.on('error', (err) => {
                clearTimeout(timer);
                reject(new Error('切り抜き処理を起動できません: ' + err.message));
            });
            proc.on('close', (code) => {
                clearTimeout(timer);
                // 終了コード 3: 透過済みの画像（処理すると壊れるため弾く）
                if (code === 3) reject(new Error('この画像はすでに透過済みです'));
                else if (code === 0) resolve();
                else reject(new Error('背景の透過処理に失敗しました: ' + stderr.trim().split('\n').pop()));
            });
        });

        return fs.readFileSync(outPath);
    } finally {
        fs.rmSync(workDir, { recursive: true, force: true });
    }
}

module.exports = {
    /**
     * 画像の背景を透過した PNG を生成
     * @param {Buffer} pngBuffer 元の PNG
     * @param {boolean} [cleanOutput] クリーン出力の画像か（true なら四方に白い余白を足して処理する）
     * @returns {Promise<Buffer>} 背景を透過した PNG
     */
    removeBackground(pngBuffer, cleanOutput) {
        const task = queue.then(() => runCutout(pngBuffer, !!cleanOutput));
        queue = task.catch(() => {});
        return task;
    }
};
