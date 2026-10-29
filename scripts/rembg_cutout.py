#!/usr/bin/env python3
"""
rembg_cutout.py

AI 切り抜きモデル (BiRefNet / rembg) による背景除去ツール。
背景の色や種類に依存せず、被写体の形から切り抜くため、背景色が被写体へ混ざる影響を受けない。
（マゼンタ背景の画像でも、通常の背景の画像でも、すでに作成済みの画像でも使える）

実行: scripts/rembg_venv/bin/python scripts/rembg_cutout.py 入力.png -o 出力.png
モデルは環境変数 U2NET_HOME 配下 (data/rembg) から読み込む。

終了コード: 0=成功 / 3=すでに透過済みの画像（処理すると壊れるため処理しない）
"""
import sys
import argparse
import numpy as np
from PIL import Image
from rembg import remove, new_session
from bleed_transparent_rgb import bleed

MODEL_NAME = 'birefnet-general-lite'


def main():
    parser = argparse.ArgumentParser(description="BiRefNet background removal")
    parser.add_argument("input", help="Path to input image")
    parser.add_argument("-o", "--output", required=True, help="Path to output PNG")
    args = parser.parse_args()

    src_img = Image.open(args.input)

    # 透過済みの画像（実際に透明な画素が一定割合以上ある）は、透明部が不透明な色で埋まって壊れるため処理しない
    #   ※ SD サーバーの出力は RGBA でも実際には不透明なことがあるため、アルファの有無ではなく透明画素の割合で判定する
    if src_img.mode in ('RGBA', 'LA') or 'transparency' in src_img.info:
        alpha_arr = np.array(src_img.convert('RGBA'))[:, :, 3]
        if (alpha_arr < 128).mean() >= 0.005:
            sys.stderr.write("ALREADY_TRANSPARENT\n")
            sys.exit(3)

    session = new_session(MODEL_NAME)
    out = remove(src_img.convert('RGB'), session=session)

    # 完全透明部の RGB を近傍の不透明色で埋める（縮小時に元の背景色が輪郭へ混ざるのを防ぐ）
    out = Image.fromarray(bleed(np.array(out.convert('RGBA'))))
    out.save(args.output, format='PNG')


if __name__ == "__main__":
    main()
