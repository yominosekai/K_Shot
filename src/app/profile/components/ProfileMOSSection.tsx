// 職場内資格管理セクションコンポーネント

import { X } from 'lucide-react';

interface ProfileMOSSectionProps {
  mos: string[];
  newMos: string;
  onNewMosChange: (mos: string) => void;
  onAddMos: () => void;
  onRemoveMos: (mos: string) => void;
  isEditing?: boolean;
}

export default function ProfileMOSSection({
  mos,
  newMos,
  onNewMosChange,
  onAddMos,
  onRemoveMos,
  isEditing = false,
}: ProfileMOSSectionProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        職場内資格
        {!isEditing && mos.length > 0 && (
          <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">
            ({mos.length})
          </span>
        )}
      </h3>
      {mos.length > 0 ? (
        <div className="flex flex-wrap gap-2 mb-4">
          {mos.map((mosItem, index) => (
            <span
              key={index}
              className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 ${
                isEditing
                  ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                  : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
              }`}
            >
              {mosItem}
              {isEditing && (
                <button
                  type="button"
                  onClick={() => onRemoveMos(mosItem)}
                  className="text-yellow-700 dark:text-yellow-300 hover:text-red-500 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </span>
          ))}
        </div>
      ) : (
        !isEditing && (
          <p className="text-gray-500 dark:text-gray-400 italic text-sm mb-4">
            職場内資格が登録されていません
          </p>
        )
      )}
      {isEditing && (
        <div className="flex gap-2">
          <input
            type="text"
            value={newMos}
            onChange={(e) => onNewMosChange(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onAddMos();
              }
            }}
            placeholder="職場内資格を入力"
            className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={onAddMos}
            className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
          >
            追加
          </button>
        </div>
      )}
    </div>
  );
}



