import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

const principles = [
  {
    title: '知見を長期的に残す',
    body: '仕様や意思決定の背景をドキュメント化し、将来のメンバーが迷わないようにする。 UI の文言やデータ構造にも意図を紐づけておく。',
  },
  {
    title: '利用者視点での一貫性',
    body: '権限によって見える情報が変わる場合でも、ナビゲーションや動線は共通化して迷子を減らす。 見た目だけでなく、レスポンスやマイクロコピーのトーンも揃える。',
  },
  {
    title: 'オフライン運用を意識した設計',
    body: 'ネットワークの状況に依存しないようキャッシュやバックアップの導線を強化し、現場で即座に復旧できる仕組みを重視する。',
  },
  {
    title: '開発者体験の改善',
    body: '機能追加よりも先にリファクタリングやログを整備し、未来の自分や他の開発者が変更しやすい土台を作る。',
  },
];

const commitments = [
  '重要な判断や学びはメモ・ドキュメント・ページとして残す',
  'UI に表示されるテキストは、できるだけ実務の言葉で書く',
  'リリース前に管理者/一般ユーザー双方の動線を必ず触って確認する',
  '「仮対応」や「一時的な設定」をコメントやマニュアルで明示する',
];

export default function PhilosophyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-10">
      <div className="flex items-center gap-3 text-sm text-blue-600">
        <ArrowLeft className="w-4 h-4" />
        <Link href="/" className="hover:underline">
          ホームへ戻る
        </Link>
      </div>

      <header className="space-y-4">
        <p className="text-sm font-semibold text-blue-500">CREATOR NOTES</p>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">開発の考え方と残しておきたいこと</h1>
        <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
          このページは、今後チームメンバーが増えたり引き継ぎが発生したときに
          「なぜこう作ったのか」「何を大切にしているのか」を共有するためのメモです。
          実装よりも背景にあるスタンスを中心にまとめています。
        </p>
      </header>

      <section className="space-y-6">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">開発理念</h2>
        <div className="grid gap-6">
          {principles.map((principle) => (
            <article
              key={principle.title}
              className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm"
            >
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{principle.title}</h3>
              <p className="mt-2 text-gray-600 dark:text-gray-300 leading-relaxed">{principle.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">開発時のコミットメント</h2>
        <div className="rounded-2xl border border-blue-100 dark:border-blue-900 bg-blue-50/60 dark:bg-blue-900/30 p-6 space-y-3">
          {commitments.map((item) => (
            <p key={item} className="text-gray-700 dark:text-gray-200">
              • {item}
            </p>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">これからのメモ</h2>
        <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
          新しい学び・改善したい点・議論の途中経過など、ドキュメント化するほどでもない情報もここに追記していきます。
          将来的には更新履歴を残して、方針の変遷も見えるようにしたいと考えています。
        </p>
      </section>
    </div>
  );
}


