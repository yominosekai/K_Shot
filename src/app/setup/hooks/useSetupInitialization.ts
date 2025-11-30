// 初期設定ページの初期化処理フック

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface UseSetupInitializationProps {
  onTokenWarning: (message: string) => void;
}

export function useSetupInitialization({ onTokenWarning }: UseSetupInitializationProps) {
  const router = useRouter();
  const [networkPath, setNetworkPath] = useState('');
  const [driveLetter, setDriveLetter] = useState('');
  const [availableDriveLetters, setAvailableDriveLetters] = useState<Array<{ letter: string; hasExistingFolder: boolean }>>([]);
  const [loading, setLoading] = useState(true);
  const [isForceMode, setIsForceMode] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // URLパラメータを確認（強制表示フラグ）
        const searchParams = new URLSearchParams(window.location.search);
        const force = searchParams.get('force') === 'true';
        setIsForceMode(force);

        const response = await fetch('/api/setup/check');
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setAvailableDriveLetters(data.availableDriveLetters || []);
            
            // デバイストークンが存在しない、またはDBに存在しない場合は、設定が完了していても/setupに留まる
            const hasValidToken = data.tokenStatus?.exists && data.tokenStatus?.validInDb;
            
            // 既に設定が完了している場合、かつ強制表示フラグがなく、かつ有効なトークンがある場合のみホームにリダイレクト
            if (data.isSetupCompleted && data.config && !force && hasValidToken) {
              router.push('/');
              return;
            }
            
            // 既存の設定がある場合は表示
            if (data.config) {
              setNetworkPath(data.config.networkPath || '');
              setDriveLetter(data.config.driveLetter || '');
            }
            
            // 画面の読み込みが完了してから、トークンファイルが存在するがDBに存在しない場合、モーダルを表示
            // または、端末で初期設定が完了しているが、トークンファイルがない場合もモーダルを表示
            if (data.tokenStatus?.exists && !data.tokenStatus?.validInDb) {
              // トークンファイルが見つかったが、DBに登録されていない場合
              onTokenWarning('トークンファイルが見つかりましたが、データベースに登録されていません。管理者からトークンファイルを再発行してもらう必要があります。');
            } else if (data.deviceSetupCompleted && !data.tokenStatus?.exists) {
              // 端末で初期設定が完了しているが、トークンファイルがない場合
              onTokenWarning('トークンファイルが破損または消失している可能性があります。管理者からトークンファイルを再発行してもらう必要があります。');
            } else if (!data.deviceSetupCompleted && data.tokenStatus?.exists && data.tokenStatus?.validInDb) {
              // トークンは有効だが端末フラグが未設定
              onTokenWarning('この端末には有効なトークンが保存されています。初期設定を完了すると通常どおり利用できます。');
            }
          }
        }
      } catch (err) {
        console.error('設定確認エラー:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]); // onTokenWarningは依存配列から除外（再作成されるたびに再実行されるのを防ぐ）

  return {
    networkPath,
    setNetworkPath,
    driveLetter,
    setDriveLetter,
    availableDriveLetters,
    loading,
    isForceMode,
  };
}
