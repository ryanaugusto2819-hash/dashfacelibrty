export type DateRange = "today" | "7days" | "30days" | "custom";

export interface KPIData {
  totalSpent: number;
  totalLeads: number;
  costPerLead: number;
  costPerSale: number;
  totalRevenue: number;
  totalSales: number;
  roi: number;
}

export interface AdMetric {
  id: string;
  name: string;
  status: "active" | "paused";
  spent: number;
  impressions: number;
  clicks: number;
  cpm: number;
  ctr: number;
  hookRate: number;
  bodyRate: number;
  cpl: number;
  cpa: number;
  leads: number;
  sales: number;
}

export interface DailyData {
  date: string;
  spent: number;
  leads: number;
  revenue: number;
}

export const kpiDataByRange: Record<string, KPIData> = {
  today: {
    totalSpent: 1245.80,
    totalLeads: 47,
    costPerLead: 26.51,
    costPerSale: 124.58,
    totalRevenue: 8970.00,
    totalSales: 10,
    roi: 619.6,
  },
  "7days": {
    totalSpent: 8721.45,
    totalLeads: 312,
    costPerLead: 27.95,
    costPerSale: 145.36,
    totalRevenue: 52890.00,
    totalSales: 60,
    roi: 506.4,
  },
  "30days": {
    totalSpent: 34580.20,
    totalLeads: 1247,
    costPerLead: 27.73,
    costPerSale: 138.32,
    totalRevenue: 198450.00,
    totalSales: 250,
    roi: 473.8,
  },
};

export const adsMetrics: AdMetric[] = [
  { id: "1", name: "Criativo VSL - Dor Principal", status: "active", spent: 4520.30, impressions: 245000, clicks: 7350, cpm: 18.45, ctr: 3.0, hookRate: 42.5, bodyRate: 28.3, cpl: 24.80, cpa: 112.50, leads: 182, sales: 40 },
  { id: "2", name: "Carrossel - Prova Social", status: "active", spent: 3890.15, impressions: 198000, clicks: 5940, cpm: 19.65, ctr: 3.0, hookRate: 38.2, bodyRate: 25.1, cpl: 28.40, cpa: 138.90, leads: 137, sales: 28 },
  { id: "3", name: "Story - Depoimento Ana", status: "active", spent: 2780.00, impressions: 165000, clicks: 5445, cpm: 16.85, ctr: 3.3, hookRate: 45.8, bodyRate: 31.2, cpl: 22.10, cpa: 105.40, leads: 126, sales: 26 },
  { id: "4", name: "Reels - Antes e Depois", status: "active", spent: 5120.80, impressions: 312000, clicks: 9360, cpm: 16.41, ctr: 3.0, hookRate: 51.2, bodyRate: 33.7, cpl: 21.50, cpa: 98.50, leads: 238, sales: 52 },
  { id: "5", name: "Imagem - Oferta Relâmpago", status: "paused", spent: 1890.45, impressions: 95000, clicks: 2375, cpm: 19.90, ctr: 2.5, hookRate: 28.4, bodyRate: 18.9, cpl: 35.60, cpa: 189.00, leads: 53, sales: 10 },
  { id: "6", name: "VSL Curto - Urgência", status: "active", spent: 3450.20, impressions: 201000, clicks: 6633, cpm: 17.16, ctr: 3.3, hookRate: 47.1, bodyRate: 30.8, cpl: 23.90, cpa: 115.00, leads: 144, sales: 30 },
  { id: "7", name: "Criativo UGC - Maria", status: "active", spent: 4210.60, impressions: 278000, clicks: 8896, cpm: 15.15, ctr: 3.2, hookRate: 52.3, bodyRate: 35.1, cpl: 20.80, cpa: 93.50, leads: 202, sales: 45 },
  { id: "8", name: "Estático - Benefícios", status: "paused", spent: 980.50, impressions: 52000, clicks: 1040, cpm: 18.86, ctr: 2.0, hookRate: 22.1, bodyRate: 14.5, cpl: 42.60, cpa: 245.10, leads: 23, sales: 4 },
];

export const dailyData: DailyData[] = Array.from({ length: 30 }, (_, i) => {
  const date = new Date();
  date.setDate(date.getDate() - (29 - i));
  return {
    date: date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
    spent: 800 + Math.random() * 600,
    leads: 30 + Math.floor(Math.random() * 30),
    revenue: 4000 + Math.random() * 4000,
  };
});
