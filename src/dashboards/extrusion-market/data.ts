/**
 * Types, data fetching hook, and utility hooks for this dashboard.
 */

import { useState, useCallback, useRef } from "react";
import { toPng } from "html-to-image";

import stratviewLogoWhite from "@/assets/stratview-logo-white.png";
import {
  useCompactMarketDataSource,
  type CompactMarketData,
  type DashboardDataSource,
} from "@/lib/dashboard-data-source";

export interface YearlyData {
  year: number;
  value: number;
}

export interface SegmentData {
  name: string;
  data: YearlyData[];
}

export interface MarketData {
  years: number[];
  totalMarket: YearlyData[];
  endUser: SegmentData[];
  aircraftType: SegmentData[];
  region: SegmentData[];
  application: SegmentData[];
  furnishedEquipment: SegmentData[];
  processType?: SegmentData[];
  materialType?: SegmentData[];
  countryDataByRegion: Record<string, SegmentData[]>;
  endUserByAircraftType: Record<string, SegmentData[]>;
  endUserByRegion: Record<string, SegmentData[]>;
  aircraftTypeByRegion: Record<string, SegmentData[]>;
  applicationByRegion: Record<string, SegmentData[]>;
  equipmentByRegion: Record<string, SegmentData[]>;
  processTypeByRegion?: Record<string, SegmentData[]>;
  materialTypeByRegion?: Record<string, SegmentData[]>;
  processTypeByApplication?: Record<string, SegmentData[]>;
}

function expandValues(years: number[], values: number[]): YearlyData[] {
  return years.map((year, index) => ({ year, value: values[index] ?? 0 }));
}

function expandSegment(
  years: number[],
  segment: Record<string, number[]>
): SegmentData[] {
  return Object.entries(segment).map(([name, values]) => ({
    name,
    data: expandValues(years, values),
  }));
}

function expandNestedSegment(
  years: number[],
  nested: Record<string, Record<string, number[]>>
): Record<string, SegmentData[]> {
  const result: Record<string, SegmentData[]> = {};

  for (const [key, segment] of Object.entries(nested)) {
    result[key] = expandSegment(years, segment);
  }

  return result;
}

function expandCompactMarketData(compact: CompactMarketData): MarketData {
  const { years } = compact;

  return {
    years,
    totalMarket: expandValues(years, compact.totalMarket),
    endUser: expandSegment(years, compact.endUser),
    aircraftType: expandSegment(years, compact.aircraftType),
    region: expandSegment(years, compact.region),
    application: expandSegment(years, compact.application),
    furnishedEquipment: expandSegment(years, compact.furnishedEquipment),
    processType: compact.processType
      ? expandSegment(years, compact.processType)
      : undefined,
    materialType: compact.materialType
      ? expandSegment(years, compact.materialType)
      : undefined,
    countryDataByRegion: expandNestedSegment(
      years,
      compact.countryDataByRegion || {}
    ),
    endUserByAircraftType: expandNestedSegment(
      years,
      compact.endUserByAircraftType || {}
    ),
    endUserByRegion: expandNestedSegment(
      years,
      compact.endUserByRegion || {}
    ),
    aircraftTypeByRegion: expandNestedSegment(
      years,
      compact.aircraftTypeByRegion || {}
    ),
    applicationByRegion: expandNestedSegment(
      years,
      compact.applicationByRegion || {}
    ),
    equipmentByRegion: expandNestedSegment(
      years,
      compact.equipmentByRegion || {}
    ),
    processTypeByRegion: compact.processTypeByRegion
      ? expandNestedSegment(years, compact.processTypeByRegion)
      : undefined,
    materialTypeByRegion: compact.materialTypeByRegion
      ? expandNestedSegment(years, compact.materialTypeByRegion)
      : undefined,
    processTypeByApplication: compact.processTypeByApplication
      ? expandNestedSegment(years, compact.processTypeByApplication)
      : undefined,
  };
}

export function calculateCAGR(
  startValue: number,
  endValue: number,
  years: number
): number {
  if (startValue <= 0 || years <= 0) return 0;
  return (Math.pow(endValue / startValue, 1 / years) - 1) * 100;
}

interface UseMarketDataResult {
  data: MarketData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useMarketData(
  source: DashboardDataSource
): UseMarketDataResult {
  const { data: compact, isLoading, error, refetch } =
    useCompactMarketDataSource(source);
  const data = compact ? expandCompactMarketData(compact) : null;

  return { data, isLoading, error, refetch };
}

export interface DrillDownState {
  isOpen: boolean;
  segmentName: string;
  segmentData: YearlyData[];
  color: string;
  relatedSegments?: { title: string; data: SegmentData[] };
}

const initialDrillDown: DrillDownState = {
  isOpen: false,
  segmentName: "",
  segmentData: [],
  color: "hsl(192, 95%, 55%)",
};

export function useDrillDown() {
  const [drillDownState, setDrillDownState] =
    useState<DrillDownState>(initialDrillDown);

  const openDrillDown = useCallback(
    (
      segmentName: string,
      segmentData: YearlyData[],
      color: string,
      relatedSegments?: { title: string; data: SegmentData[] }
    ) => {
      setDrillDownState({
        isOpen: true,
        segmentName,
        segmentData,
        color,
        relatedSegments,
      });
    },
    []
  );

  const closeDrillDown = useCallback(
    () => setDrillDownState(initialDrillDown),
    []
  );

  return { drillDownState, openDrillDown, closeDrillDown };
}

const EXPORT_WIDTH = 1920;
const EXPORT_HEIGHT = 1080;
const HEADER_HEIGHT = 90;
const FOOTER_HEIGHT = 60;
const BG_COLOR = "#0a0f1a";

export function useChartDownload() {
  const downloadChart = useCallback(
    async (ref: React.RefObject<HTMLDivElement>, filename: string, title?: string) => {
      if (!ref.current) return;

      try {
        const filter = (node: HTMLElement) =>
          !node?.hasAttribute?.("data-download-exclude");

        const chartDataUrl = await toPng(ref.current, {
          backgroundColor: BG_COLOR,
          quality: 1,
          pixelRatio: 3,
          filter,
        });

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        canvas.width = EXPORT_WIDTH;
        canvas.height = EXPORT_HEIGHT;
        ctx.fillStyle = BG_COLOR;
        ctx.fillRect(0, 0, EXPORT_WIDTH, EXPORT_HEIGHT);

        if (title) {
          ctx.fillStyle = "rgba(255,255,255,0.04)";
          ctx.fillRect(0, 0, EXPORT_WIDTH, HEADER_HEIGHT);
          ctx.fillStyle = "rgba(255,255,255,0.95)";
          ctx.font = "bold 28px system-ui, sans-serif";
          ctx.textAlign = "left";
          ctx.fillText(title, 40, 55);
        }

        const chartImg = new Image();
        chartImg.src = chartDataUrl;
        await new Promise<void>((resolve) => {
          chartImg.onload = () => resolve();
        });

        const topOffset = title ? HEADER_HEIGHT : 20;
        const padding = 30;
        const chartAreaWidth = EXPORT_WIDTH - padding * 2;
        const chartAreaHeight = EXPORT_HEIGHT - topOffset - FOOTER_HEIGHT - padding;
        const scale = Math.min(
          chartAreaWidth / chartImg.width,
          chartAreaHeight / chartImg.height
        );
        const drawW = chartImg.width * scale;
        const drawH = chartImg.height * scale;

        ctx.drawImage(
          chartImg,
          (EXPORT_WIDTH - drawW) / 2,
          topOffset + (chartAreaHeight - drawH) / 2,
          drawW,
          drawH
        );

        ctx.fillStyle = "rgba(255,255,255,0.05)";
        ctx.fillRect(0, EXPORT_HEIGHT - FOOTER_HEIGHT, EXPORT_WIDTH, FOOTER_HEIGHT);

        const logoImg = new Image();
        logoImg.src = stratviewLogoWhite;
        await new Promise<void>((resolve) => {
          logoImg.onload = () => resolve();
        });

        const logoH = 30;
        const logoW = (logoImg.width / logoImg.height) * logoH;
        ctx.drawImage(
          logoImg,
          24,
          EXPORT_HEIGHT - FOOTER_HEIGHT + (FOOTER_HEIGHT - logoH) / 2,
          logoW,
          logoH
        );

        ctx.fillStyle = "rgba(255,255,255,0.6)";
        ctx.font = "14px system-ui, sans-serif";
        ctx.textAlign = "right";
        ctx.fillText(
          "stratviewresearch.com",
          EXPORT_WIDTH - 24,
          EXPORT_HEIGHT - FOOTER_HEIGHT + (FOOTER_HEIGHT + 10) / 2
        );

        const link = document.createElement("a");
        link.download = `${filename}.png`;
        link.href = canvas.toDataURL("image/png", 1);
        link.click();
      } catch (error) {
        console.error("Failed to download chart:", error);
      }
    },
    []
  );

  return { downloadChart };
}
