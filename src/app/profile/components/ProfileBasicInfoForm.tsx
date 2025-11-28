// 基本情報フォームコンポーネント

import { useState, useEffect } from 'react';

interface Department {
  id: string;
  name: string;
  description: string | null;
}

interface ProfileBasicInfoFormProps {
  formData: {
    display_name: string;
    email: string;
    bio: string;
    department: string;
  };
  onFormDataChange: (field: string, value: string) => void;
}

export default function ProfileBasicInfoForm({
  formData,
  onFormDataChange,
}: ProfileBasicInfoFormProps) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loadingDepartments, setLoadingDepartments] = useState(false);

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        setLoadingDepartments(true);
        const response = await fetch('/api/departments');
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setDepartments(data.departments || []);
          }
        }
      } catch (err) {
        console.error('部署一覧取得エラー:', err);
      } finally {
        setLoadingDepartments(false);
      }
    };

    fetchDepartments();
  }, []);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        基本情報
      </h3>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            表示名
          </label>
          <input
            type="text"
            value={formData.display_name}
            onChange={(e) => onFormDataChange('display_name', e.target.value)}
            className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            メールアドレス
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => onFormDataChange('email', e.target.value)}
            className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            部署
          </label>
          <select
            value={formData.department}
            onChange={(e) => onFormDataChange('department', e.target.value)}
            className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">選択しない</option>
            {loadingDepartments ? (
              <option disabled>読み込み中...</option>
            ) : (
              departments.map((dept) => (
                <option key={dept.id} value={dept.name}>
                  {dept.name}
                </option>
              ))
            )}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            自己紹介
          </label>
          <textarea
            value={formData.bio}
            onChange={(e) => onFormDataChange('bio', e.target.value)}
            rows={4}
            className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="自己紹介を入力してください"
          />
        </div>
      </div>
    </div>
  );
}

