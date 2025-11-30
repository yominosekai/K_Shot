import fs from 'fs';
import path from 'path';
import { redirect } from 'next/navigation';
import { ReactNode, Children, isValidElement, cloneElement, Fragment } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import GithubSlugger from 'github-slugger';
import ManualToc, { type ManualHeading } from './components/ManualToc';
import ManualDocSelector from './components/ManualDocSelector';
import ManualSearchBar from './components/ManualSearchBar';
import ManualSearchMatchNavigator from './components/ManualSearchMatchNavigator';
import { manualDocs, filterDocsByPermission, isAdminOnlyDoc } from '@/content/help/docs';
import { requireAuth, isAdmin } from '@/shared/lib/auth/middleware';

const getManualContent = (filePath: string) => {
  // 開発時はsrc/content/help、ビルド時はpublic/content/helpを優先的に試す
  // src/content/helpのパスをpublic/content/helpに変換
  const publicPath = filePath.replace('src/content/help', 'public/content/help');
  
  let content: string;
  try {
    // まずsrc/content/helpを試す（開発環境・編集したファイルを優先）
    content = fs.readFileSync(path.join(process.cwd(), filePath), 'utf-8');
  } catch {
    // なければpublic/content/helpを試す（ビルド後の本番環境）
    content = fs.readFileSync(path.join(process.cwd(), publicPath), 'utf-8');
  }
  // 先頭のh1タイトル行、説明文、区切り線（---）を削除
  // パターン: # タイトル\n\n説明文\n\n---\n\n までを削除
  const lines = content.split('\n');
  let skipMode = true;
  let foundH1 = false;
  let foundDescription = false;
  const cleanedLines: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // h1行をスキップ
    if (skipMode && trimmed.match(/^#\s+/)) {
      foundH1 = true;
      continue;
    }
    
    // h1の後の空行をスキップ
    if (skipMode && foundH1 && !foundDescription && trimmed === '') {
      continue;
    }
    
    // h1の後の説明文をスキップ（---が見つかるまで）
    if (skipMode && foundH1 && !foundDescription) {
      if (trimmed.match(/^---$/)) {
        // 区切り線を見つけた
        foundDescription = true;
        skipMode = false;
        // 区切り線とその後の空行をスキップ
        if (i + 1 < lines.length && lines[i + 1].trim() === '') {
          i++; // 次の空行もスキップ
        }
        continue;
      } else {
        // 説明文の行をスキップ
        continue;
      }
    }
    
    // スキップモードが終わったら通常処理
    if (!skipMode) {
      cleanedLines.push(line);
    }
  }
  
  return cleanedLines.join('\n');
};

const extractHeadings = (markdown: string): ManualHeading[] => {
  const slugger = new GithubSlugger();
  const headingRegex = /^(#{2,3})\s+(.*)$/gm;
  const headings: ManualHeading[] = [];
  let match: RegExpExecArray | null;

  while ((match = headingRegex.exec(markdown)) !== null) {
    const [, hashes, title] = match;
    const level = hashes.length;
    if (level !== 2) {
      continue;
    }

    const cleanedTitle = title.trim();
    const id = slugger.slug(cleanedTitle);
    headings.push({ id, title: cleanedTitle, level });
  }

  return headings;
};

const getTextFromNode = (children: ReactNode): string =>
  Children.toArray(children)
    .map((child) => {
      if (typeof child === 'string') return child;
      if (typeof child === 'number') return String(child);
      if (isValidElement(child)) {
        return getTextFromNode((child.props as { children?: ReactNode })?.children);
      }
      return '';
    })
    .join('')
    .trim();

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

type RegisterHit = (docId: string, localIndex: number) => number;

const highlightString = (
  text: string,
  query?: string,
  registerHit?: RegisterHit,
  docId?: string
) => {
  if (!query) {
    return text;
  }
  const escaped = escapeRegExp(query);
  if (!escaped) {
    return text;
  }

  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);

  if (parts.length === 1) {
    return text;
  }

  let localHitCounter = 0;
  return parts.map((part, index) => {
    if (index % 2 === 1) {
      localHitCounter += 1;
      const globalHitIndex = registerHit?.(docId || '', localHitCounter) ?? localHitCounter;
      return (
        <mark
          key={`${part}-${index}-${globalHitIndex}`}
          className="rounded bg-yellow-200/80 px-1 py-0.5 text-gray-900"
          data-manual-hit="true"
          data-hit-index={localHitCounter}
          data-doc-id={docId}
          data-global-hit-index={globalHitIndex}
        >
          {part}
        </mark>
      );
    }
    return part;
  });
};

const highlightNode = (node: ReactNode, query?: string, registerHit?: RegisterHit, docId?: string): ReactNode => {
  if (!query) {
    return node;
  }

  if (typeof node === 'string') {
    return highlightString(node, query, registerHit, docId);
  }

  if (Array.isArray(node)) {
    return node.map((child, index) => <Fragment key={index}>{highlightNode(child, query, registerHit, docId)}</Fragment>);
  }

  if (isValidElement(node)) {
    const props = node.props as { children?: ReactNode };
    if (props?.children) {
    return cloneElement(node, {
        ...props,
        children: highlightNode(props.children, query, registerHit, docId),
      } as any);
    }
  }

  return node;
};

const createMarkdownComponents = (searchQuery?: string, docId?: string, globalHitIndexMap?: Map<string, Map<number, number>>) => {
  const slugger = new GithubSlugger();
  const registerHit = (docId: string, localIndex: number) => {
    if (!globalHitIndexMap || !docId) {
      return localIndex;
    }
    const docMap = globalHitIndexMap.get(docId);
    if (!docMap) {
      return localIndex;
    }
    return docMap.get(localIndex) ?? localIndex;
  };
  const applyHighlight = (node: ReactNode) => highlightNode(node, searchQuery, registerHit, docId);

  const MarkdownImage = (props: React.ComponentProps<'img'>) => {
    const { src, alt } = props;
    return (
    <figure className="my-8 overflow-hidden rounded-2xl border border-gray-100 dark:border-gray-700 shadow-md bg-white dark:bg-slate-800">
      {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={typeof src === 'string' ? src : undefined} alt={alt} className="w-full h-auto" loading="lazy" />
      {alt ? <figcaption className="text-sm text-gray-500 dark:text-gray-400 px-4 py-2">{alt}</figcaption> : null}
    </figure>
  );
  };

  const Paragraph = ({ children }: { children?: ReactNode }) => {
    const elements = Children.toArray(children);
    if (elements.length === 1 && isValidElement(elements[0]) && elements[0].type === MarkdownImage) {
      return <>{elements[0]}</>;
    }
    return <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-5">{applyHighlight(children)}</p>;
  };

  return {
    h1: ({ children }: { children?: ReactNode }) => (
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">{children}</h1>
    ),
    h2: ({ children }: { children?: ReactNode }) => {
      const text = getTextFromNode(children);
      const id = slugger.slug(text);
      return (
        <h2
          id={id}
          className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mt-16 mb-6 pb-2 border-b-2 border-indigo-200 dark:border-indigo-800 scroll-mt-24"
        >
          {applyHighlight(children)}
        </h2>
      );
    },
    h3: ({ children }: { children?: ReactNode }) => {
      const text = getTextFromNode(children);
      const id = slugger.slug(text);
      return (
        <h3 id={id} className="text-xl font-semibold text-gray-800 dark:text-gray-100 mt-10 mb-4">
          {applyHighlight(children)}
        </h3>
      );
    },
    h4: ({ children }: { children?: ReactNode }) => {
      const text = getTextFromNode(children);
      const id = slugger.slug(text);
      return (
        <h4 id={id} className="text-lg font-semibold text-gray-700 dark:text-gray-200 mt-8 mb-3">
          {applyHighlight(children)}
        </h4>
      );
    },
    p: Paragraph,
    ul: ({ children }: { children?: ReactNode }) => (
      <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300 mb-5">{applyHighlight(children)}</ul>
    ),
    ol: ({ children }: { children?: ReactNode }) => (
      <ol className="list-decimal pl-6 space-y-2 text-gray-700 dark:text-gray-300 mb-5">{applyHighlight(children)}</ol>
    ),
    li: ({ children }: { children?: ReactNode }) => (
      <li className="leading-relaxed">{applyHighlight(children)}</li>
    ),
    img: MarkdownImage,
    blockquote: ({ children }: { children?: ReactNode }) => (
      <blockquote className="border-l-4 border-indigo-400 bg-indigo-50/60 dark:bg-indigo-900/30 px-6 py-4 rounded-r-xl text-gray-700 dark:text-gray-200 italic mb-6">
        {applyHighlight(children)}
      </blockquote>
    ),
    hr: () => <hr className="my-12 border-dashed border-gray-200 dark:border-gray-700" />,
    table: ({ children }: { children?: ReactNode }) => (
      <div className="my-8 overflow-x-auto">
        <table className="w-full border-collapse border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800 shadow-sm rounded-lg">
          {applyHighlight(children)}
        </table>
      </div>
    ),
    thead: ({ children }: { children?: ReactNode }) => (
      <thead className="bg-gray-50 dark:bg-slate-700">{applyHighlight(children)}</thead>
    ),
    tbody: ({ children }: { children?: ReactNode }) => (
      <tbody>{applyHighlight(children)}</tbody>
    ),
    tr: ({ children }: { children?: ReactNode }) => (
      <tr className="border-b border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
        {applyHighlight(children)}
      </tr>
    ),
    th: ({ children }: { children?: ReactNode }) => (
      <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left font-semibold text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-slate-700">
        {applyHighlight(children)}
      </th>
    ),
    td: ({ children }: { children?: ReactNode }) => {
      // <br>タグを改行に変換する処理
      const processBrTags = (node: ReactNode): ReactNode => {
        if (typeof node === 'string') {
          // 文字列内の<br>を改行に変換
          const parts = node.split(/<br\s*\/?>/i);
          if (parts.length > 1) {
            return (
              <>
                {parts.map((part, index) => (
                  <span key={index}>
                    {part}
                    {index < parts.length - 1 && <br />}
                  </span>
                ))}
              </>
            );
          }
          return node;
        }
        if (Array.isArray(node)) {
          return node.map((child, index) => (
            <Fragment key={index}>{processBrTags(child)}</Fragment>
          ));
        }
        if (isValidElement(node)) {
          const props = node.props as { children?: ReactNode };
          if (props?.children) {
          return cloneElement(node, {
              ...props,
              children: processBrTags(props.children),
            } as any);
          }
        }
        return node;
      };

      const processedChildren = processBrTags(children);
      return (
        <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-gray-700 dark:text-gray-300">
          {applyHighlight(processedChildren)}
        </td>
      );
    },
  };
};

type ManualPageProps = {
  searchParams?: Promise<Record<string, string | string[]>>;
};

export default async function ManualPage({ searchParams }: ManualPageProps) {
  // 認証チェック（キャッシュを使用）
  const authResult = await requireAuth();
  if (!authResult.success) {
    redirect('/');
  }

  // 通常はキャッシュされたユーザー情報を使用
  let user = authResult.user;
  let userIsAdmin = isAdmin(user);

  // 権限に応じてドキュメントをフィルタリング
  const availableDocs = filterDocsByPermission(manualDocs, userIsAdmin);

  const resolvedSearchParams = (await searchParams) ?? {};
  const docParam = resolvedSearchParams.doc;
  const docIdParam = Array.isArray(docParam) ? docParam[0] : docParam;
  const queryParam = resolvedSearchParams.q;
  const queryParamValue = Array.isArray(queryParam) ? queryParam[0] : queryParam;
  const searchQuery = queryParamValue?.trim() ?? '';
  const matchParam = resolvedSearchParams.match;
  const matchParamValue = Array.isArray(matchParam) ? matchParam[0] : matchParam;
  const requestedMatchIndex = matchParamValue ? Number(matchParamValue) || 1 : 1;

  // 管理者以外が管理者専用ドキュメントにアクセスしようとした場合のリダイレクト
  if (docIdParam && isAdminOnlyDoc(docIdParam) && !userIsAdmin) {
    redirect('/help');
  }

  // フィルタリングされたドキュメントのみを処理
  const docsWithContent = availableDocs.map((doc) => ({
    ...doc,
    content: getManualContent(doc.file),
  }));

  const activeDoc = docsWithContent.find((doc) => doc.id === docIdParam) ?? docsWithContent[0];
  const headings = extractHeadings(activeDoc.content);
  const highlightQuery = searchQuery.length ? searchQuery : undefined;
  const normalizedQuery = highlightQuery?.toLowerCase();
  
  // 全ドキュメントのマッチを集計
  type MatchInfo = { docId: string; localIndex: number; globalIndex: number };
  const allMatches: MatchInfo[] = [];
  const globalHitIndexMap = new Map<string, Map<number, number>>();
  
  if (normalizedQuery) {
    const escapedQuery = escapeRegExp(normalizedQuery);
    let globalIndex = 0;
    
    docsWithContent.forEach((doc) => {
      // 各ドキュメントごとに新しい正規表現を作成（lastIndexの問題を回避）
      const matchRegex = new RegExp(escapedQuery, 'gi');
      const docContent = doc.content.toLowerCase();
      let match: RegExpExecArray | null;
      let localIndex = 0;
      const docMap = new Map<number, number>();
      
      while ((match = matchRegex.exec(docContent)) !== null) {
        localIndex += 1;
        globalIndex += 1;
        docMap.set(localIndex, globalIndex);
        allMatches.push({ docId: doc.id, localIndex, globalIndex });
      }
      
      if (docMap.size > 0) {
        globalHitIndexMap.set(doc.id, docMap);
      }
    });
  }
  
  const totalMatchCount = allMatches.length;
  const activeDocMatchRegex = normalizedQuery ? new RegExp(escapeRegExp(normalizedQuery), 'g') : null;
  const activeDocMatchCount = activeDocMatchRegex ? activeDoc.content.toLowerCase().match(activeDocMatchRegex)?.length ?? 0 : 0;
  
  // グローバルインデックスから現在のドキュメント内のローカルインデックスを取得
  const currentGlobalIndex = requestedMatchIndex <= totalMatchCount ? requestedMatchIndex : 1;
  const currentMatch = allMatches.find((m) => m.globalIndex === currentGlobalIndex);
  
  // 現在のドキュメント内のマッチを探す
  let currentMatchIndex = 0;
  if (currentMatch && currentMatch.docId === activeDoc.id) {
    // 現在のドキュメント内のマッチの場合、そのローカルインデックスを使う
    currentMatchIndex = currentMatch.localIndex;
  } else if (normalizedQuery && activeDocMatchCount > 0) {
    // 現在のドキュメント内のマッチを探す
    const activeDocMatches = allMatches.filter((m) => m.docId === activeDoc.id);
    if (activeDocMatches.length > 0) {
      // 現在のドキュメント内の最初のマッチのローカルインデックスを使う
      currentMatchIndex = activeDocMatches[0].localIndex;
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-slate-900 dark:text-slate-100">
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm">
        <div className="w-full px-4 sm:px-6 lg:px-8 pt-4 pb-0 space-y-2">
          <p className="text-xs uppercase tracking-[0.35em] text-indigo-500 dark:text-indigo-300">DOCUMENTATION</p>
          <h1 className="text-3xl font-bold">{activeDoc.title}</h1>
          <p className="text-gray-600 dark:text-slate-300 leading-relaxed">{activeDoc.description}</p>
          <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:gap-6">
            <div className="flex-1 min-w-0 mt-1">
              <ManualDocSelector activeDocId={activeDoc.id} availableDocs={availableDocs} />
            </div>
            <div className="lg:ml-auto lg:-mt-0.5 flex-shrink-0">
              <ManualSearchBar
                docs={docsWithContent.map(({ id, title, content }) => ({ id, title, content }))}
                activeDocId={activeDoc.id}
                initialQuery={searchQuery}
                matchCount={totalMatchCount}
                currentMatchIndex={currentGlobalIndex}
                allMatches={allMatches}
              />
            </div>
          </div>
        </div>
      </header>

      <main className="relative w-full px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        <article className="rounded-3xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-xl p-6 sm:p-10 [&>h2:first-child]:mt-0">
          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={createMarkdownComponents(highlightQuery, activeDoc.id, globalHitIndexMap)}>
            {activeDoc.content}
          </ReactMarkdown>
          <ManualSearchMatchNavigator matchIndex={currentMatchIndex} query={highlightQuery} docId={activeDoc.id} />
        </article>

        <ManualToc headings={headings} />
      </main>
    </div>
  );
}

