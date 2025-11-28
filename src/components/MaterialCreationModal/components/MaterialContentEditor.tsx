// 本文（Markdown）エディターコンポーネント

interface MaterialContentEditorProps {
  content: string;
  onContentChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  isUploading: boolean;
}

export default function MaterialContentEditor({
  content,
  onContentChange,
  isUploading,
}: MaterialContentEditorProps) {
  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        本文（Markdown対応）
      </h3>
      <textarea
        name="content"
        value={content}
        onChange={onContentChange}
        rows={10}
        disabled={isUploading}
        className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm disabled:opacity-50"
      />
    </div>
  );
}



