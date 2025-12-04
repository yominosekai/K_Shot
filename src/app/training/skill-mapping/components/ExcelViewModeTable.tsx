// エクセル形式表示モードテーブルコンポーネント

'use client';

import type { SkillPhaseItem } from '@/shared/lib/data-access/skill-mapping';

interface ExcelViewModeTableProps {
  data: SkillPhaseItem[];
}

export default function ExcelViewModeTable({ data }: ExcelViewModeTableProps) {
  // データを階層ごとにグループ化
  const grouped: Record<string, SkillPhaseItem[]> = {};
  data.forEach((row) => {
    const key = `${row.category}|${row.item}|${row.subCategory}`;
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(row);
  });

  // 大分類ごとにグループ化
  const categoryGroups: Record<string, string[]> = {};
  Object.keys(grouped).forEach((key) => {
    const [category] = key.split('|');
    if (!categoryGroups[category]) {
      categoryGroups[category] = [];
    }
    categoryGroups[category].push(key);
  });

  const rows: Array<{
    category: string | null;
    categoryRowspan: number;
    item: string | null;
    itemRowspan: number;
    subCategory: string;
    phase1: string;
    phase2: string;
    phase3: string;
    phase4: string;
    phase5: string;
  }> = [];

  // 大分類の順序（データから動的に取得、なければアルファベット順）
  const categories = Object.keys(categoryGroups).sort();

  categories.forEach((category) => {
    if (!categoryGroups[category]) return;

    // 項目ごとにグループ化
    const itemGroups: Record<string, string[]> = {};
    categoryGroups[category].forEach((key) => {
      const [, item] = key.split('|');
      if (!itemGroups[item]) {
        itemGroups[item] = [];
      }
      itemGroups[item].push(key);
    });

    let categoryRowspan = 0;
    Object.keys(itemGroups).forEach((item) => {
      let itemRowspan = 0;
      itemGroups[item].forEach((key) => {
        itemRowspan += 1; // 中分類ごとに1行
      });
      categoryRowspan += itemRowspan;
    });

    let categoryRowspanUsed = 0;
    Object.keys(itemGroups).forEach((item, itemIdx) => {
      let itemRowspan = 0;
      itemGroups[item].forEach((key) => {
        itemRowspan += 1; // 中分類ごとに1行
      });

      let itemRowspanUsed = 0;
      itemGroups[item].forEach((key, subIdx) => {
        const [, , subCategory] = key.split('|');
        const subCategoryData = grouped[key];

        // フェーズごとにグループ化
        const phaseGroups: Record<number, SkillPhaseItem[]> = {};
        subCategoryData.forEach((row) => {
          if (!phaseGroups[row.phase]) {
            phaseGroups[row.phase] = [];
          }
          phaseGroups[row.phase].push(row);
        });

        // フェーズ1～5のデータを準備
        const phaseData: Record<number, string> = {};
        for (let phase = 1; phase <= 5; phase++) {
          if (phaseGroups[phase]) {
            // 小分類ごとにグループ化
            const smallCategoryGroups: Record<string, SkillPhaseItem[]> = {};
            phaseGroups[phase].forEach((row) => {
              if (!smallCategoryGroups[row.smallCategory]) {
                smallCategoryGroups[row.smallCategory] = [];
              }
              smallCategoryGroups[row.smallCategory].push(row);
            });

            // 小分類ごとにテキストを生成（各取り組み名を別行に）
            const texts: string[] = [];
            Object.keys(smallCategoryGroups).forEach((smallCategory) => {
              const items = smallCategoryGroups[smallCategory];
              items.forEach((item) => {
                texts.push(`${smallCategory}: ${item.name}`);
              });
            });
            phaseData[phase] = texts.join('\n');
          } else {
            phaseData[phase] = '';
          }
        }

        const isFirstCategoryRow = categoryRowspanUsed === 0 && itemIdx === 0 && subIdx === 0;
        const isFirstItemRow = itemRowspanUsed === 0 && subIdx === 0;

        rows.push({
          category: isFirstCategoryRow ? category : null,
          categoryRowspan: isFirstCategoryRow ? categoryRowspan : 0,
          item: isFirstItemRow ? item : null,
          itemRowspan: isFirstItemRow ? itemRowspan : 0,
          subCategory: subCategory,
          phase1: phaseData[1],
          phase2: phaseData[2],
          phase3: phaseData[3],
          phase4: phaseData[4],
          phase5: phaseData[5],
        });

        categoryRowspanUsed++;
        itemRowspanUsed++;
      });
    });
  });

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full border-separate text-sm" style={{ borderSpacing: 0 }}>
          <thead>
            <tr className="bg-orange-200 dark:bg-orange-800">
              <th
                className="border border-gray-400 dark:border-gray-600 px-4 py-3 text-left text-xs font-medium text-orange-900 dark:text-orange-100 uppercase tracking-wider text-center rounded-tl-lg"
                rowSpan={2}
              >
                大分類
              </th>
              <th
                className="border border-gray-400 dark:border-gray-600 px-4 py-3 text-left text-xs font-medium text-orange-900 dark:text-orange-100 uppercase tracking-wider text-center"
                rowSpan={2}
              >
                項目
              </th>
              <th
                className="border border-gray-400 dark:border-gray-600 px-4 py-3 text-left text-xs font-medium text-orange-900 dark:text-orange-100 uppercase tracking-wider text-center"
                rowSpan={2}
              >
                中分類
              </th>
              <th
                className="border border-gray-400 dark:border-gray-600 px-4 py-3 text-left text-xs font-medium text-orange-900 dark:text-orange-100 uppercase tracking-wider text-center rounded-tr-lg"
                colSpan={5}
              >
                スキルフェーズ
              </th>
            </tr>
            <tr className="bg-orange-50 dark:bg-orange-900">
              <th className="border border-gray-400 dark:border-gray-600 px-4 py-3 text-left text-xs font-medium text-orange-900 dark:text-orange-100 uppercase tracking-wider text-center">
                1
              </th>
              <th className="border border-gray-400 dark:border-gray-600 px-4 py-3 text-left text-xs font-medium text-orange-900 dark:text-orange-100 uppercase tracking-wider text-center">
                2
              </th>
              <th className="border border-gray-400 dark:border-gray-600 px-4 py-3 text-left text-xs font-medium text-orange-900 dark:text-orange-100 uppercase tracking-wider text-center">
                3
              </th>
              <th className="border border-gray-400 dark:border-gray-600 px-4 py-3 text-left text-xs font-medium text-orange-900 dark:text-orange-100 uppercase tracking-wider text-center">
                4
              </th>
              <th className="border border-gray-400 dark:border-gray-600 px-4 py-3 text-left text-xs font-medium text-orange-900 dark:text-orange-100 uppercase tracking-wider text-center">
                5
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800">
            {rows.map((row, idx) => {
              const isLastRow = idx === rows.length - 1;
              // 最後の行で最初に表示されるセルを特定
              // row.categoryが存在する場合、それはrowSpanで最初の行から最後の行まで続いているので、最後の行でもそのセルが最初
              // row.categoryが存在しない場合、row.itemが最初
              // row.itemも存在しない場合、row.subCategoryが最初
              const isLastRowFirstCell = isLastRow && row.category;
              const isLastRowFirstCellIfNoCategory = isLastRow && !row.category && row.item;
              const isLastRowFirstCellIfNoCategoryAndItem = isLastRow && !row.category && !row.item;
              return (
                <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  {row.category && (
                    <td
                      rowSpan={row.categoryRowspan}
                      className={`border border-gray-400 dark:border-gray-600 px-4 py-3 text-sm text-gray-900 dark:text-white font-semibold text-center align-middle bg-gray-100 dark:bg-gray-800 ${isLastRowFirstCell ? 'rounded-bl-lg' : ''}`}
                    >
                      {row.category}
                    </td>
                  )}
                  {row.item && (
                    <td
                      rowSpan={row.itemRowspan}
                      className={`border border-gray-400 dark:border-gray-600 px-4 py-3 text-sm text-gray-900 dark:text-white text-left align-middle bg-gray-100 dark:bg-gray-800 ${isLastRowFirstCellIfNoCategory ? 'rounded-bl-lg' : ''}`}
                    >
                      {row.item}
                    </td>
                  )}
                  <td className={`border border-gray-400 dark:border-gray-600 px-4 py-3 text-sm text-gray-900 dark:text-white text-left align-middle bg-gray-50 dark:bg-gray-700 ${isLastRowFirstCellIfNoCategoryAndItem ? 'rounded-bl-lg' : ''}`}>
                    {row.subCategory}
                  </td>
                  <td className="border border-gray-400 dark:border-gray-600 px-4 py-3 text-xs text-gray-900 dark:text-white align-top whitespace-pre-line">
                    {row.phase1 && (
                      <div className="space-y-1">
                        {row.phase1.split('\n').map((text, i) => (
                          <div key={i}>{text}</div>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="border border-gray-400 dark:border-gray-600 px-4 py-3 text-xs text-gray-900 dark:text-white align-top whitespace-pre-line">
                    {row.phase2 && (
                      <div className="space-y-1">
                        {row.phase2.split('\n').map((text, i) => (
                          <div key={i}>{text}</div>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="border border-gray-400 dark:border-gray-600 px-4 py-3 text-xs text-gray-900 dark:text-white align-top whitespace-pre-line">
                    {row.phase3 && (
                      <div className="space-y-1">
                        {row.phase3.split('\n').map((text, i) => (
                          <div key={i}>{text}</div>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="border border-gray-400 dark:border-gray-600 px-4 py-3 text-xs text-gray-900 dark:text-white align-top whitespace-pre-line">
                    {row.phase4 && (
                      <div className="space-y-1">
                        {row.phase4.split('\n').map((text, i) => (
                          <div key={i}>{text}</div>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className={`border border-gray-400 dark:border-gray-600 px-4 py-3 text-xs text-gray-900 dark:text-white align-top whitespace-pre-line ${isLastRow ? 'rounded-br-lg' : ''}`}>
                    {row.phase5 && (
                      <div className="space-y-1">
                        {row.phase5.split('\n').map((text, i) => (
                          <div key={i}>{text}</div>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

