// スキル管理セクションコンポーネント

import { X } from 'lucide-react';

interface ProfileSkillsSectionProps {
  skills: string[];
  newSkill: string;
  onNewSkillChange: (skill: string) => void;
  onAddSkill: () => void;
  onRemoveSkill: (skill: string) => void;
  isEditing?: boolean;
}

export default function ProfileSkillsSection({
  skills,
  newSkill,
  onNewSkillChange,
  onAddSkill,
  onRemoveSkill,
  isEditing = false,
}: ProfileSkillsSectionProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        スキル
        {!isEditing && skills.length > 0 && (
          <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">
            ({skills.length})
          </span>
        )}
      </h3>
      {skills.length > 0 ? (
        <div className="flex flex-wrap gap-2 mb-4">
          {skills.map((skill, index) => (
            <span
              key={index}
              className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 ${
                isEditing
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
              }`}
            >
              {skill}
              {isEditing && (
                <button
                  type="button"
                  onClick={() => onRemoveSkill(skill)}
                  className="text-blue-700 dark:text-blue-300 hover:text-red-500 transition-colors"
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
            スキルが登録されていません
          </p>
        )
      )}
      {isEditing && (
        <div className="flex gap-2">
          <input
            type="text"
            value={newSkill}
            onChange={(e) => onNewSkillChange(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onAddSkill();
              }
            }}
            placeholder="スキルを入力（例：Python, JavaScript）"
            className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={onAddSkill}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            追加
          </button>
        </div>
      )}
    </div>
  );
}



