// Example architecture for multiple ECharts instances with shared controls

interface PlotInstance {
  id: string;
  chart: echarts.ECharts;
  element: HTMLElement;
  gridIndex: number;
  series: any[];
}

export class MultiChartComponent {
  private plots: Map<string, PlotInstance> = new Map();
  private sharedDataZoom: any;
  private legendState: Map<string, boolean> = new Map();
  
  // Create individual plot
  private createPlot(containerId: string, data: any[], gridIndex: number): PlotInstance {
    const element = document.getElementById(containerId);
    const chart = echarts.init(element);
    
    const options = {
      animation: false, // Disable for better performance
      grid: {
        top: '10%',
        bottom: '10%',
        left: '12%',
        right: '1%'
      },
      xAxis: {
        type: 'time',
        // Share time range across all plots
        min: this.sharedTimeRange?.min,
        max: this.sharedTimeRange?.max
      },
      yAxis: { type: 'value' },
      series: data,
      // No legend, no dataZoom - handled externally
      legend: { show: false },
      dataZoom: []
    };
    
    chart.setOption(options);
    
    // Sync zoom events
    chart.on('dataZoom', (params) => {
      this.syncZoomToAllPlots(params, containerId);
    });
    
    return { id: containerId, chart, element, gridIndex, series: data };
  }
  
  // Sync zoom across all plots
  private syncZoomToAllPlots(zoomParams: any, sourceId: string): void {
    const { start, end } = zoomParams;
    
    this.plots.forEach((plot, id) => {
      if (id !== sourceId) {
        plot.chart.dispatchAction({
          type: 'dataZoom',
          start,
          end
        });
      }
    });
    
    // Update custom dataZoom UI
    this.updateCustomDataZoom(start, end);
  }
  
  // Custom legend toggle
  public toggleSeries(seriesName: string): void {
    const newState = !this.legendState.get(seriesName);
    this.legendState.set(seriesName, newState);
    
    // Update all plots that have this series
    this.plots.forEach(plot => {
      const seriesIndex = plot.series.findIndex(s => s.name === seriesName);
      if (seriesIndex >= 0) {
        plot.chart.dispatchAction({
          type: 'legendToggleSelect',
          name: seriesName
        });
      }
    });
  }
  
  // Performance optimization: Update only specific plot
  public updatePlotData(plotId: string, newData: any[]): void {
    const plot = this.plots.get(plotId);
    if (plot) {
      plot.series = newData;
      plot.chart.setOption({
        series: newData
      });
    }
  }
  
  // Cleanup
  public destroy(): void {
    this.plots.forEach(plot => {
      plot.chart.dispose();
    });
    this.plots.clear();
  }
}

// HTML Template Structure:
/*
<div class="multi-chart-container">
  <!-- Sticky Legend -->
  <nav class="legend-overlay sticky">...</nav>
  
  <!-- Plot Container -->
  <div class="plots-wrapper">
    <div id="plot-1" class="plot-instance"></div>
    <div id="plot-2" class="plot-instance"></div>
    <div id="plot-3" class="plot-instance"></div>
  </div>
  
  <!-- Sticky DataZoom -->
  <div class="custom-datazoom sticky">
    <input type="range" (input)="onZoomChange($event)">
  </div>
</div>

CSS:
.plots-wrapper {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.plot-instance {
  height: 200px; // Fixed height per plot
  position: relative;
}

.legend-overlay.sticky,
.custom-datazoom.sticky {
  position: sticky;
  top: 0;
  z-index: 100;
  background: white;
}
*/