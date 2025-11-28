// 資料ダウンロードユーティリティ

/**
 * 資料をZIPファイルとしてダウンロードする
 */
export async function downloadMaterialAsZip(materialId: string): Promise<void> {
  try {
    const response = await fetch(`/api/materials/${materialId}/download-zip`);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'ダウンロードに失敗しました');
    }

    // レスポンスからファイル名を取得
    const contentDisposition = response.headers.get('Content-Disposition');
    let fileName = `material_${materialId}.zip`;
    if (contentDisposition) {
      const fileNameMatch = contentDisposition.match(/filename\*=UTF-8''(.+)/);
      if (fileNameMatch) {
        fileName = decodeURIComponent(fileNameMatch[1]);
      }
    }

    // Blobとして取得してダウンロード
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  } catch (err) {
    console.error('ダウンロードエラー:', err);
    throw err;
  }
}

