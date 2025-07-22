# Remaining Implementation Tasks

## Component Methods to Add

### 1. Add Missing Methods to echarts-line-chart.component.ts

```typescript
// Add after the validateDataPoint method (around line 433)

// UI Methods
public hasVisibleButtons(): boolean {
  return this.settings.enableImageExport !== false ||
         this.settings.enableDataZoom ||
         this.settings.showInlineStats !== false ||
         this.settings.showMinMaxLines !== false ||
         this.settings.showAlarmViolationAreas !== false ||
         this.settings.showAlarmThresholdLines !== false;
}

public menuButtons(action: string): void {
  switch(action) {
    case 'genImage':
      this.exportChartImage();
      break;
    case 'reset':
      this.resetZoom();
      break;
    case 'toggleInlineStats':
      this.showStatsPanel = !this.showStatsPanel;
      if (this.showStatsPanel) {
        this.calculateStatistics();
      }
      break;
    case 'showMinMax':
      this.showMinMaxLines = !this.showMinMaxLines;
      this.updateMinMaxLines();
      break;
    case 'toggleAlarmStatus':
      this.showAlarmVisualization = !this.showAlarmVisualization;
      this.updateAlarmVisualization();
      break;
  }
  
  if (this.ctx.detectChanges) {
    this.ctx.detectChanges();
  }
}

private exportChartImage(): void {
  if (!this.chart) return;
  
  const format = this.settings.exportFormat || 'png';
  const quality = this.settings.exportQuality || 1;
  
  try {
    const dataURL = this.chart.getDataURL({
      type: format,
      pixelRatio: 2,
      backgroundColor: '#fff',
      quality: format === 'jpeg' ? quality : undefined
    });
    
    // Create download link
    const link = document.createElement('a');
    link.href = dataURL;
    link.download = `chart_${new Date().getTime()}.${format}`;
    link.click();
  } catch (error) {
    console.error('[ECharts Line Chart] Error exporting image:', error);
  }
}

private resetZoom(): void {
  if (!this.chart) return;
  
  this.chart.dispatchAction({
    type: 'dataZoom',
    dataZoomIndex: 0,
    start: 0,
    end: 100
  });
}

private calculateStatistics(): void {
  if (!this.ctx.data || this.ctx.data.length === 0) return;
  
  // For now, calculate stats for the first series
  const firstSeries = this.ctx.data[0];
  if (!firstSeries.data || firstSeries.data.length === 0) return;
  
  const values = firstSeries.data.map(point => point[1]).filter(v => !isNaN(v));
  if (values.length === 0) return;
  
  const decimals = this.getDecimals(0);
  const units = this.getUnits(0);
  
  // Current value (last value)
  this.currentValue = formatValue(values[values.length - 1], decimals, units);
  
  // Min and Max
  const min = Math.min(...values);
  const max = Math.max(...values);
  this.minValue = formatValue(min, decimals, units);
  this.maxValue = formatValue(max, decimals, units);
  
  // Average
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  this.avgValue = formatValue(avg, decimals, units);
  
  // Standard deviation
  const variance = values.reduce((sum, value) => {
    const diff = value - avg;
    return sum + (diff * diff);
  }, 0) / values.length;
  const stdDev = Math.sqrt(variance);
  this.stdDevValue = formatValue(stdDev, decimals, units);
}

private updateMinMaxLines(): void {
  if (!this.chart || !this.chartOption) return;
  
  // Update series with markLine data
  const updatedOption = { ...this.chartOption };
  
  if (updatedOption.series && Array.isArray(updatedOption.series)) {
    updatedOption.series.forEach((series: any) => {
      if (this.showMinMaxLines && series.data && series.data.length > 0) {
        const values = series.data.map((d: any) => d[1]).filter((v: number) => !isNaN(v));
        if (values.length > 0) {
          const min = Math.min(...values);
          const max = Math.max(...values);
          
          series.markLine = {
            silent: true,
            symbol: 'none',
            lineStyle: {
              type: this.settings.minMaxLineStyle || 'dashed',
              opacity: this.settings.minMaxLineOpacity || 0.5
            },
            data: [
              { yAxis: min, label: { formatter: 'Min: {c}' } },
              { yAxis: max, label: { formatter: 'Max: {c}' } }
            ]
          };
        }
      } else {
        delete series.markLine;
      }
    });
  }
  
  this.chart.setOption(updatedOption);
}

private updateAlarmVisualization(): void {
  if (!this.chart || !this.chartOption) return;
  
  // This would integrate with ThingsBoard's alarm system
  // For now, just log the action
  console.log('[ECharts Line Chart] Alarm visualization toggled:', this.showAlarmVisualization);
  
  // In a real implementation, you would:
  // 1. Get alarm thresholds from entity attributes or widget settings
  // 2. Add markArea for violation regions
  // 3. Add markLine for threshold lines
}
```

### 2. Update onDataUpdated Method

Add this to the onDataUpdated method to store data for statistics:

```typescript
// Add after line where you process data (around line 130)
this.currentData = this.ctx.data;

// At the end of onDataUpdated, update statistics if panel is visible
if (this.showStatsPanel) {
  this.calculateStatistics();
}
```

### 3. Module Imports

Make sure these are imported in examples.module.ts:
```typescript
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCheckboxModule } from '@angular/material/checkbox';
```

## Testing Steps

1. **Compile and Build**
   ```bash
   npm start
   ```

2. **Test in Dashboard**
   - Navigate to test dashboard
   - Enter edit mode
   - Check all button visibility based on settings
   - Test each button functionality

3. **Test Settings**
   - Open widget settings
   - Toggle various options
   - Verify buttons show/hide appropriately
   - Check settings persistence

## Future Enhancements

1. **Multi-Series Statistics**
   - Add series selector dropdown
   - Calculate stats per series
   - Show stats for specific plots

2. **Advanced Alarm Integration**
   - Connect to ThingsBoard alarm API
   - Support entity attribute thresholds
   - Real-time alarm updates

3. **Export Enhancements**
   - Add export size options
   - Support batch export
   - Include statistics in export

4. **Performance Optimization**
   - Debounce statistics calculation
   - Optimize min/max line updates
   - Cache alarm threshold data