// 初期設定ページ専用レイアウト（Header/Sidebarなし）

export default function SetupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

