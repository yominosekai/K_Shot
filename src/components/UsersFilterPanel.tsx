// 利用者フィルターパネルコンポーネント

import { useState, useEffect } from 'react';
import { Filter } from 'lucide-react';
import type { User } from '@/features/auth/types';

interface Department {
  id: string;
  name: string;
  description?: string;
}

interface UsersFilterPanelProps {
  showFilters: boolean;
  onToggleFilters: () => void;
  selectedStatus: string;
  onStatusChange: (status: string) => void;
  selectedDepartment: string;
  onDepartmentChange: (department: string) => void;
  selectedSkills: string[];
  onSkillsChange: (skills: string[]) => void;
  selectedCertifications: string[];
  onCertificationsChange: (certifications: string[]) => void;
  selectedMosList: string[];
  onMosListChange: (mosList: string[]) => void;
  users: User[];
}

export default function UsersFilterPanel({
  showFilters,
  onToggleFilters,
  selectedStatus,
  onStatusChange,
  selectedDepartment,
  onDepartmentChange,
  selectedSkills,
  onSkillsChange,
  selectedCertifications,
  onCertificationsChange,
  selectedMosList,
  onMosListChange,
  users,
}: UsersFilterPanelProps) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loadingDepartments, setLoadingDepartments] = useState(false);

  // 部署一覧を取得
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

  // すべてのユーザーから一意のスキル、資格、職場内資格を抽出
  const allSkills = Array.from(
    new Set(
      users
        .flatMap((user) => user.skills || [])
        .filter((skill) => skill && skill.trim() !== '')
    )
  ).sort();

  const allCertifications = Array.from(
    new Set(
      users
        .flatMap((user) => user.certifications || [])
        .filter((cert) => cert && cert.trim() !== '')
    )
  ).sort();

  const allMos = Array.from(
    new Set(
      users
        .flatMap((user) => user.mos || [])
        .filter((mos) => mos && mos.trim() !== '')
    )
  ).sort();

  return (
    <>
      {/* フィルター詳細 */}
      {showFilters && (
        <div className="mb-6 p-5 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* ステータス */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                ステータス
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => onStatusChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100"
              >
                <option value="all">すべて</option>
                <option value="active">アクティブ</option>
                <option value="inactive">非アクティブ</option>
              </select>
            </div>

            {/* 部署 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                部署
              </label>
              <select
                value={selectedDepartment}
                onChange={(e) => onDepartmentChange(e.target.value)}
                disabled={loadingDepartments}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="all">すべて</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.name}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>

            {/* スキル */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                スキル {selectedSkills.length > 0 && `(${selectedSkills.length}件選択中)`}
              </label>
              <div className="max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg p-2 space-y-1">
                {allSkills.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 px-2 py-1">スキルがありません</p>
                ) : (
                  allSkills.map((skill) => (
                    <label
                      key={skill}
                      className="flex items-center space-x-2 px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedSkills.includes(skill)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            onSkillsChange([...selectedSkills, skill]);
                          } else {
                            onSkillsChange(selectedSkills.filter((s) => s !== skill));
                          }
                        }}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                      />
                      <span className="text-sm text-gray-900 dark:text-gray-100">{skill}</span>
                    </label>
                  ))
                )}
              </div>
            </div>

            {/* 資格 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                資格 {selectedCertifications.length > 0 && `(${selectedCertifications.length}件選択中)`}
              </label>
              <div className="max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg p-2 space-y-1">
                {allCertifications.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 px-2 py-1">資格がありません</p>
                ) : (
                  allCertifications.map((cert) => (
                    <label
                      key={cert}
                      className="flex items-center space-x-2 px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedCertifications.includes(cert)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            onCertificationsChange([...selectedCertifications, cert]);
                          } else {
                            onCertificationsChange(selectedCertifications.filter((c) => c !== cert));
                          }
                        }}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                      />
                      <span className="text-sm text-gray-900 dark:text-gray-100">{cert}</span>
                    </label>
                  ))
                )}
              </div>
            </div>

            {/* 職場内資格 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                職場内資格 {selectedMosList.length > 0 && `(${selectedMosList.length}件選択中)`}
              </label>
              <div className="max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg p-2 space-y-1">
                {allMos.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 px-2 py-1">職場内資格がありません</p>
                ) : (
                  allMos.map((mos) => (
                    <label
                      key={mos}
                      className="flex items-center space-x-2 px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedMosList.includes(mos)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            onMosListChange([...selectedMosList, mos]);
                          } else {
                            onMosListChange(selectedMosList.filter((m) => m !== mos));
                          }
                        }}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                      />
                      <span className="text-sm text-gray-900 dark:text-gray-100">{mos}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

