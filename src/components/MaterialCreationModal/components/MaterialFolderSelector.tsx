// 保存先フォルダ選択コンポーネント

interface Folder {
  id: string;
  name: string;
  path: string;
}

interface MaterialFolderSelectorProps {
  folderPath: string;
  folders: Folder[];
  onFolderPathChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  isUploading: boolean;
}

export default function MaterialFolderSelector({
  folderPath,
  folders,
  onFolderPathChange,
  isUploading,
}: MaterialFolderSelectorProps) {
  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">保存先</h3>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          保存先フォルダ
        </label>
        <select
          name="folder_path"
          value={folderPath}
          onChange={onFolderPathChange}
          disabled={isUploading}
          className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        >
          <option value="">選択しない（ルートに保存）</option>
          {folders.map((folder) => (
            <option key={folder.id} value={folder.path}>
              {folder.path || folder.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}



