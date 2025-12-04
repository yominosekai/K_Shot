// ゴミ箱移動のプログレスバーモーダルコンポーネント（後方互換性のため残す）
// 内部で汎用のProgressModalを使用

import ProgressModal from './ProgressModal';

interface TrashProgressModalProps {
  isVisible: boolean;
  progress: number;
  message: string;
}

export default function TrashProgressModal({
  isVisible,
  progress,
  message,
}: TrashProgressModalProps) {
  // メッセージからタイトルを自動判定
  const title = message.includes('復元') ? '復元中...' : 'ゴミ箱に移動中...';

  return (
    <ProgressModal
      isVisible={isVisible}
      progress={progress}
      message={message}
      title={title}
    />
  );
}

