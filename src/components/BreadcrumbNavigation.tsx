// パンくずナビゲーションコンポーネント

import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
  name: string;
  path: string;
}

interface BreadcrumbNavigationProps {
  breadcrumb: BreadcrumbItem[];
  onBreadcrumbClick: (path: string) => void;
}

export default function BreadcrumbNavigation({
  breadcrumb,
  onBreadcrumbClick,
}: BreadcrumbNavigationProps) {
  return (
    <div className="flex items-center space-x-2 text-sm mb-2">
      {breadcrumb.map((item, index) => (
        <div key={item.path} className="flex items-center space-x-2">
          {index === 0 ? (
            <button
              onClick={() => onBreadcrumbClick(item.path)}
              className="flex items-center space-x-1 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            >
              <Home className="w-4 h-4" />
              <span>{item.name}</span>
            </button>
          ) : (
            <>
              <ChevronRight className="w-4 h-4 text-gray-400" />
              <button
                onClick={() => onBreadcrumbClick(item.path)}
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
              >
                {item.name}
              </button>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

