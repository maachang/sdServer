#!/usr/bin/env bash
# 背景切り抜き (BiRefNet / rembg) の実行環境セットアップ
#   scripts/rembg_venv に Python 仮想環境を作り、rembg と onnxruntime を入れ、モデル(約224MB)を data/rembg にダウンロードする。
#   使い方: scripts/setup_rembg.sh
set -euo pipefail
cd "$(dirname "$0")/.."

python3 -m venv scripts/rembg_venv
scripts/rembg_venv/bin/pip install --quiet "rembg[cpu]"

# モデルを data/rembg に取得（実行時の U2NET_HOME と同じ場所）
mkdir -p data/rembg
U2NET_HOME="$PWD/data/rembg" scripts/rembg_venv/bin/python -c "from rembg import new_session; new_session('birefnet-general-lite')"
echo "セットアップ完了"
