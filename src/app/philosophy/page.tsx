import fs from 'fs';
import path from 'path';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

const getPhilosophyContent = () => {
  // 開発時はsrc/content/help、ビルド時はpublic/content/helpを優先的に試す
  const filePath = 'src/content/help/development-philosophy.md';
  const publicPath = 'public/content/help/development-philosophy.md';
  
  let content: string;
  try {
    // まずsrc/content/helpを試す（開発環境・編集したファイルを優先）
    content = fs.readFileSync(path.join(process.cwd(), filePath), 'utf-8');
  } catch {
    // なければpublic/content/helpを試す（ビルド後の本番環境）
    content = fs.readFileSync(path.join(process.cwd(), publicPath), 'utf-8');
  }
  
  return content;
};

export default function PhilosophyPage() {
  const content = getPhilosophyContent();
  
  // Markdownコンポーネントのカスタマイズ
  const markdownComponents = {
    h1: ({ children }: { children?: React.ReactNode }) => (
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6">{children}</h1>
    ),
    h2: ({ children }: { children?: React.ReactNode }) => (
      <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mt-10 mb-6 pb-2 border-b-2 border-indigo-200 dark:border-indigo-800">{children}</h2>
    ),
    h3: ({ children }: { children?: React.ReactNode }) => (
      <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mt-8 mb-4">{children}</h3>
    ),
    p: ({ children }: { children?: React.ReactNode }) => (
      <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-5">{children}</p>
    ),
    ul: ({ children }: { children?: React.ReactNode }) => (
      <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300 mb-5">{children}</ul>
    ),
    ol: ({ children }: { children?: React.ReactNode }) => (
      <ol className="list-decimal pl-6 space-y-2 text-gray-700 dark:text-gray-300 mb-5">{children}</ol>
    ),
    li: ({ children }: { children?: React.ReactNode }) => (
      <li className="leading-relaxed">{children}</li>
    ),
    blockquote: ({ children }: { children?: React.ReactNode }) => (
      <blockquote className="border-l-4 border-indigo-400 bg-indigo-50/60 dark:bg-indigo-900/30 px-6 py-4 rounded-r-xl text-gray-700 dark:text-gray-200 italic mb-6">{children}</blockquote>
    ),
    hr: () => <hr className="my-12 border-dashed border-gray-200 dark:border-gray-700" />,
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-slate-900 dark:text-slate-100">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        <div className="flex items-center gap-3 text-sm text-blue-600 dark:text-blue-400 mb-4">
          <ArrowLeft className="w-4 h-4" />
          <Link href="/" className="hover:underline">
            ホームへ戻る
          </Link>
        </div>

        <article className="rounded-3xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-xl p-6 sm:p-10">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw]}
            components={markdownComponents}
          >
            {content}
          </ReactMarkdown>
        </article>
      </div>
    </div>
  );
}


