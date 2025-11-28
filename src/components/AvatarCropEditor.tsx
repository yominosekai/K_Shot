'use client';

import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { X } from 'lucide-react';
import Image from 'next/image';
import type { Area, Point } from 'react-easy-crop';

interface AvatarCropEditorProps {
  imageSrc: string;
  onCropComplete: (croppedImageBlob: Blob) => void;
  onCancel: () => void;
  size?: number;
}

export const AvatarCropEditor: React.FC<AvatarCropEditorProps> = ({
  imageSrc,
  onCropComplete,
  onCancel,
  size = 200,
}) => {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1); // 100%を初期値
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const onCropChange = useCallback((crop: Point) => {
    setCrop(crop);
  }, []);

  const onZoomChange = useCallback((zoom: number) => {
    setZoom(zoom);
  }, []);

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = document.createElement('img');
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', (error) => reject(error));
      image.src = url;
    });

  const getCroppedImg = async (
    imageSrc: string,
    pixelCrop: Area
  ): Promise<Blob> => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Canvas context is not available');
    }

    // 円形クロップ用のサイズを設定
    canvas.width = size;
    canvas.height = size;

    // 背景を白で塗りつぶす（JPEGなどの非透過画像の余白対策）
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, size, size);

    // 円形マスクを作成
    ctx.save();
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.clip();

    // クロップされた画像を描画
    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      size,
      size
    );

    ctx.restore();

    // PNG形式で保存（透過背景をサポート、余白も白で塗りつぶされている）
    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob'));
          }
        },
        'image/png',
        1.0 // PNGは品質設定がないので1.0
      );
    });
  };

  const onCropCompleteCallback = useCallback(
    async (croppedArea: Area, croppedAreaPixels: Area) => {
      setCroppedAreaPixels(croppedAreaPixels);
      
      // プレビュー画像を生成
      try {
        const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels);
        const url = URL.createObjectURL(croppedImage);
        setPreviewUrl((prevUrl) => {
          // 前のURLをクリーンアップ
          if (prevUrl) {
            URL.revokeObjectURL(prevUrl);
          }
          return url;
        });
      } catch (error) {
        console.error('Error generating preview:', error);
      }
    },
    [imageSrc]
  );

  const handleSave = async () => {
    if (!croppedAreaPixels) {
      return;
    }

    try {
      const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels);
      onCropComplete(croppedImage);
    } catch (error) {
      console.error('Error cropping image:', error);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" 
      onClick={onCancel}
      onMouseDown={(e) => {
        // モーダル内のクリックは無視
        if ((e.target as HTMLElement).closest('.modal-content')) {
          e.stopPropagation();
        }
      }}
    >
      <div
        className="modal-content bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            プロフィール画像を編集
          </h3>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
            aria-label="閉じる"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* メイン編集エリア */}
        <div className="flex-1 p-6 overflow-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 左側: 編集エリア */}
            <div className="lg:col-span-2">
              <div 
                className="relative bg-gray-100 dark:bg-gray-900 rounded-lg overflow-hidden" 
                style={{ aspectRatio: '1', minHeight: '400px' }}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
              >
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  cropShape="round"
                  minZoom={0.5}
                  maxZoom={2}
                  restrictPosition={false}
                  onCropChange={onCropChange}
                  onZoomChange={onZoomChange}
                  onCropComplete={onCropCompleteCallback}
                  style={{
                    containerStyle: {
                      width: '100%',
                      height: '100%',
                      position: 'relative',
                    },
                  }}
                />
              </div>

              {/* ズームコントロール */}
              <div className="mt-4 flex items-center justify-center gap-4">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  ズーム:
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.05"
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="flex-1 max-w-xs h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-sm text-gray-600 dark:text-gray-400 min-w-[3rem] text-right">
                  {Math.round(zoom * 100)}%
                </span>
              </div>
            </div>

            {/* 右側: プレビューと説明 */}
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  プレビュー
                </h4>
                <div className="w-32 h-32 mx-auto rounded-full overflow-hidden border-4 border-gray-200 dark:border-gray-700 shadow-lg bg-gray-100 dark:bg-gray-900">
                  {previewUrl ? (
                    <Image
                      src={previewUrl}
                      alt="Preview"
                      width={128}
                      height={128}
                      className="w-full h-full object-cover"
                      unoptimized={previewUrl.startsWith('data:')}
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                      <span className="text-gray-400 dark:text-gray-500 text-xs">プレビュー</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 space-y-2 text-sm text-gray-700 dark:text-gray-300">
                <p className="font-semibold">使い方:</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>画像をドラッグして移動</li>
                  <li>マウスホイールでズーム</li>
                  <li>スライダーでズーム調整</li>
                  <li>円形に切り抜かれます</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* フッター */}
        <div className="flex items-center justify-end gap-4 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onCancel}
            className="px-6 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
};
