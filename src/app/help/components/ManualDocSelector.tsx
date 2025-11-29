import Link from 'next/link';
import type { ManualDocDefinition } from '@/content/help/docs';

interface ManualDocSelectorProps {
  activeDocId: string;
  availableDocs: ManualDocDefinition[];
}

export default function ManualDocSelector({ activeDocId, availableDocs }: ManualDocSelectorProps) {
  return (
    <div className="-mt-1">
      <div
        className="flex gap-3 overflow-x-auto rounded-2xl p-2 [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: 'none' }}
      >
        {availableDocs.map((doc) => {
          const isActive = doc.id === activeDocId;
          return (
            <Link
              key={doc.id}
              href={`/help?doc=${doc.id}`}
              className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              {doc.title}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

