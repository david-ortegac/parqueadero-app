import { Injectable } from '@angular/core';
import { OCCUPANCY_CHART_COLORS, OCCUPANCY_CHART_LABELS } from '../constants/parking-billing.catalog';
import { DashboardResponse } from '../models/parking.models';

export interface OccupancyChartData {
  labels: string[];
  datasets: {
    data: number[];
    backgroundColor: string[];
    hoverBackgroundColor: string[];
  }[];
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  readonly chartOptions: Record<string, unknown> = {
    plugins: {
      legend: {
        position: 'bottom',
        labels: { usePointStyle: true, padding: 16 },
      },
    },
    cutout: '68%',
    maintainAspectRatio: false,
  };

  buildChartData(dashboard: DashboardResponse | null): OccupancyChartData {
    if (!dashboard) {
      return { labels: [], datasets: [{ data: [], backgroundColor: [], hoverBackgroundColor: [] }] };
    }
    const c = dashboard.occupancy.car.active;
    const m = dashboard.occupancy.motorcycle.active;
    if (c + m === 0) {
      return {
        labels: ['Sin vehículos'],
        datasets: [{ data: [1], backgroundColor: ['#e2e8f0'], hoverBackgroundColor: ['#cbd5e1'] }],
      };
    }
    return {
      labels: [...OCCUPANCY_CHART_LABELS],
      datasets: [
        {
          data: [c, m],
          backgroundColor: [OCCUPANCY_CHART_COLORS.car.fill, OCCUPANCY_CHART_COLORS.motorcycle.fill],
          hoverBackgroundColor: [OCCUPANCY_CHART_COLORS.car.hover, OCCUPANCY_CHART_COLORS.motorcycle.hover],
        },
      ],
    };
  }

  totalActive(dashboard: DashboardResponse | null): number {
    if (!dashboard) {
      return 0;
    }
    return dashboard.occupancy.car.active + dashboard.occupancy.motorcycle.active;
  }

  sharePercent(active: number, total: number): number {
    if (total === 0) {
      return 0;
    }
    return Math.round((active / total) * 1000) / 10;
  }

  occupancyPct(active: number, capacity: number | null): number {
    if (!capacity || capacity <= 0) {
      return 0;
    }
    return Math.min(100, Math.round((active / capacity) * 100));
  }
}
