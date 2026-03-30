import { BarChart3, Plane, Globe, Users, Layers, FlaskConical } from "lucide-react";
import type { DashboardDataSource } from "@/lib/dashboard-data-source";

export type TabType = "overview" | "endUser" | "aircraft" | "region" | "application" | "equipment" | "process" | "material";
export interface TabConfig { id: TabType; label: string; icon: React.ComponentType<{ className?: string }>; }

const extrusionDataSource = {
  kind: "live",
  dashboardSlug: "extrusion-market",
} as const satisfies DashboardDataSource;

export const config = {
  dataSource: extrusionDataSource,
  title: "Aircraft Interiors Extrusion Market",
  subtitle: "Global Market Research Dashboard",
  defaultYear: 2025, useMillions: true,
  footerText: "Aircraft Interiors Extrusion Market Research Report",
  footerUnit: "All values in US$ Million unless otherwise specified",
  backPath: "/dataset/aircraft-interiors", backLabel: "Back to Aircraft Interiors",
  tabs: [
    { id: "overview", label: "Market Overview", icon: BarChart3 },
    { id: "application", label: "Application Type", icon: Layers },
    { id: "aircraft", label: "Aircraft Type", icon: Plane },
    { id: "region", label: "Region", icon: Globe },
    { id: "material", label: "Material Type", icon: FlaskConical },
    { id: "endUser", label: "End User", icon: Users },
  ] as TabConfig[],
  labels: { endUser: "End User", equipment: "Material Type", application: "Application Type", processType: "Process Type", materialType: "Material Type" },
  segmentMapping: {
    application: { dataKey: "application", title: "Application Type" }, aircraft: { dataKey: "aircraftType", title: "Aircraft Type" },
    region: { dataKey: "region", title: "Region" }, material: { dataKey: "materialType", title: "Material Type" },
    endUser: { dataKey: "endUser", title: "End User" },
  } as Record<string, { dataKey: string; title: string }>,
  routePath: "/dashboard/extrusion-market",
  catalog: { categoryId: "aerospace-defense", datasetId: "aircraft-interiors", dashboardId: "ai-extrusion" },
} as const;
