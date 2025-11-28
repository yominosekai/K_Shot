// 資格管理セクションコンポーネント

import { X } from 'lucide-react';

interface ProfileCertificationsSectionProps {
  certifications: string[];
  newCertification: string;
  onNewCertificationChange: (certification: string) => void;
  onAddCertification: () => void;
  onRemoveCertification: (certification: string) => void;
  isEditing?: boolean;
}

export default function ProfileCertificationsSection({
  certifications,
  newCertification,
  onNewCertificationChange,
  onAddCertification,
  onRemoveCertification,
  isEditing = false,
}: ProfileCertificationsSectionProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        資格・認定
        {!isEditing && certifications.length > 0 && (
          <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">
            ({certifications.length})
          </span>
        )}
      </h3>
      {certifications.length > 0 ? (
        <div className="flex flex-wrap gap-2 mb-4">
          {certifications.map((certification, index) => (
            <span
              key={index}
              className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 ${
                isEditing
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                  : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
              }`}
            >
              {certification}
              {isEditing && (
                <button
                  type="button"
                  onClick={() => onRemoveCertification(certification)}
                  className="text-green-700 dark:text-green-300 hover:text-red-500 transition-colors"
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
            資格・認定が登録されていません
          </p>
        )
      )}
      {isEditing && (
        <div className="flex gap-2">
          <input
            type="text"
            value={newCertification}
            onChange={(e) => onNewCertificationChange(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onAddCertification();
              }
            }}
            placeholder="資格・認定を入力（例：情報処理安全確保支援士）"
            className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={onAddCertification}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
          >
            追加
          </button>
        </div>
      )}
    </div>
  );
}



