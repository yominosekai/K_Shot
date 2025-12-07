// 部署フィルタコンポーネント

'use client';

interface DepartmentFilterProps {
  departments: string[];
  selectedDepartment: string;
  onDepartmentChange: (department: string) => void;
}

export default function DepartmentFilter({
  departments,
  selectedDepartment,
  onDepartmentChange,
}: DepartmentFilterProps) {
  return (
    <div className="flex items-center space-x-4 mb-6">
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
        部署フィルタ:
      </label>
      <div className="flex space-x-2 flex-wrap gap-2">
        <button
          onClick={() => onDepartmentChange('all')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            selectedDepartment === 'all'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
          }`}
        >
          すべて
        </button>
        {departments.map(dept => (
          <button
            key={dept}
            onClick={() => onDepartmentChange(dept)}
            className={`px-4 py-2 rounded-lg transition-colors ${
              selectedDepartment === dept
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            {dept}
          </button>
        ))}
      </div>
    </div>
  );
}

