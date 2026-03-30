import { useCallback, useEffect, useState } from "react";

import { ENDPOINTS } from "@/config/api";
import { useAppSelector } from "@/store/hooks";

export interface CompactMarketData {
  years: number[];
  totalMarket: number[];
  endUser: Record<string, number[]>;
  aircraftType: Record<string, number[]>;
  region: Record<string, number[]>;
  application: Record<string, number[]>;
  furnishedEquipment: Record<string, number[]>;
  processType?: Record<string, number[]>;
  materialType?: Record<string, number[]>;
  countryDataByRegion: Record<string, Record<string, number[]>>;
  endUserByAircraftType: Record<string, Record<string, number[]>>;
  endUserByRegion: Record<string, Record<string, number[]>>;
  aircraftTypeByRegion: Record<string, Record<string, number[]>>;
  applicationByRegion: Record<string, Record<string, number[]>>;
  equipmentByRegion: Record<string, Record<string, number[]>>;
  processTypeByRegion?: Record<string, Record<string, number[]>>;
  materialTypeByRegion?: Record<string, Record<string, number[]>>;
  processTypeByApplication?: Record<string, Record<string, number[]>>;
}

export interface StaticDashboardDataSource {
  kind: "static";
  url: string;
}

export interface LiveDashboardDataSource {
  kind: "live";
  dashboardSlug: string;
}

export type DashboardDataSource =
  | StaticDashboardDataSource
  | LiveDashboardDataSource;

interface UseCompactMarketDataSourceResult {
  data: CompactMarketData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

function resolveStaticDataUrl(url: string): string {
  const baseUrl = import.meta.env.BASE_URL.endsWith("/")
    ? import.meta.env.BASE_URL.slice(0, -1)
    : import.meta.env.BASE_URL;

  return `${baseUrl}${url}`;
}

function buildLiveDashboardDataUrl(dashboardSlug: string): string {
  const query = new URLSearchParams({ dashboard_slug: dashboardSlug });
  return `${ENDPOINTS.DASHBOARD.DATA}?${query.toString()}`;
}

async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const data = await response.json();
    if (typeof data?.message === "string" && data.message.trim()) {
      return data.message;
    }
  } catch {
    // Ignore non-JSON responses and fall back to status text.
  }

  return `Failed to fetch market data: ${response.status} ${response.statusText}`.trim();
}

export function useCompactMarketDataSource(
  source: DashboardDataSource
): UseCompactMarketDataSourceResult {
  const token = useAppSelector((state) => state.auth.token);
  const [data, setData] = useState<CompactMarketData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      let requestUrl: string;
      const headers = new Headers({ Accept: "application/json" });

      if (source.kind === "live") {
        if (!token) {
          throw new Error("Authentication required to load live dashboard data.");
        }

        requestUrl = buildLiveDashboardDataUrl(source.dashboardSlug);
        headers.set("Authorization", `Bearer ${token}`);
      } else {
        requestUrl = resolveStaticDataUrl(source.url);
      }

      const response = await fetch(requestUrl, {
        cache: "no-store",
        headers,
      });

      if (!response.ok) {
        throw new Error(await extractErrorMessage(response));
      }

      const compact = (await response.json()) as CompactMarketData;
      setData(compact);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load market data");
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [source, token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData };
}
