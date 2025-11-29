// 全体状況ページの型定義

// アクティビティ統計関連の型定義
export type Period = '1month' | '3months' | '6months' | '1year' | 'custom';

export interface CustomDateRange {
  startDate: string;
  endDate: string;
}

export interface OverallStats {
  totalLogins: number;
  totalViews: number;
  avgViews: number;
  activeUsers: number;
  totalMaterials: number;
  totalUsers: number;
}

export interface UserDistribution {
  userId: string;
  displayName: string;
  viewCount: number;
  uniqueMaterials: number;
  activityLevel: 'high' | 'medium' | 'low';
}

export interface UserActivityStats {
  userId: string;
  displayName: string;
  loginCount: number;
  viewCount: number;
  uniqueMaterials: number;
  uploadedMaterials: number;
  activeDays: number;
  dailyData: Array<{ date: string; count: number }>;
  activityData: Array<{ date: string; viewCount: number; uploadCount: number }>;
  materialData: Array<{ materialId: string; title: string; count: number }>;
}

export interface ActivityStatsResponse {
  overallStats: OverallStats;
  userRankings: UserActivityStats[];
  userDistribution: UserDistribution[];
}

export interface IndividualStatsResponse {
  user: UserActivityStats;
  period: Period;
}

interface MaterialType {
  id: string;
  name: string;
  description?: string;
  sort_order: number;
}

export interface OverviewPageProps {
  stats: {
    totalUsers: number;
    activeUsers: number;
    totalMaterials: number;
    newMaterialsThisMonth: number;
    updatedMaterialsThisMonth: number;
  } | null;
  period: '7' | '30' | '90' | '365';
  granularity: 'daily' | 'weekly' | 'monthly';
  userActivityData: any[];
  materialActivityData: any[];
  activityLoading: boolean;
  types: MaterialType[];
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  selectedType: string;
  setSelectedType: (type: string) => void;
  categoryData: any[];
  typeData: any[];
  categoryLoading: boolean;
  typeLoading: boolean;
  categoryName: string;
  onPeriodChange: (period: '7' | '30' | '90' | '365') => void;
  onGranularityChange: (granularity: 'daily' | 'weekly' | 'monthly') => void;
  onRefresh: () => Promise<void>;
}

export type OverviewTabType = 'knowledge' | 'overall' | 'individual';

export interface ActivityViewProps {
  overallData: ActivityStatsResponse | null;
  individualData: { user: UserActivityStats; period: Period } | null;
  loading: boolean;
  error: string | null;
  onUserSelect: (user: UserActivityStats) => void;
  onBack: () => void;
  period: Period;
  onPeriodChange: (period: Period) => void;
  onSyncComplete: () => void;
}

