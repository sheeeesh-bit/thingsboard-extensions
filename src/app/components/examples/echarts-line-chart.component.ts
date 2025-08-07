import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnInit,
  ViewChild,
  OnDestroy
} from '@angular/core';
import * as echarts from 'echarts/core';
import { WidgetContext } from '@home/models/widget-component.models';
import { LineChart } from 'echarts/charts';
import {
  GridComponent,
  TooltipComponent,
  DataZoomComponent,
  LegendComponent,
  TitleComponent,
  MarkLineComponent,
  MarkAreaComponent
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import * as XLSX from 'xlsx';

// Register required components
echarts.use([
  LineChart,
  GridComponent,
  TooltipComponent,
  DataZoomComponent,
  LegendComponent,
  TitleComponent,
  MarkLineComponent,
  MarkAreaComponent,
  CanvasRenderer
]);

// Constants from ThingsBoard example
const AXIS_POSITION_NAMES = {
  TOP: "Top",
  MIDDLE: "Middle",
  BOTTOM: "Bottom",
};

const SIZE_NAMES = {
  SMALL: "small",
  LARGE: "large",
  HUGE: "huge",
};

const axisPositionMap = {
  Top: 0,
  Middle: 1,
  Bottom: 2
};

@Component({
  selector: 'tb-echarts-line-chart',
  templateUrl: './echarts-line-chart.component.html',
  styleUrls: ['./echarts-line-chart.component.scss']
})
export class EchartsLineChartComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('chartContainer', {static: false}) chartContainer: ElementRef<HTMLElement>;
  @Input() ctx: WidgetContext;

  private chart: echarts.ECharts;
  private resizeObserver: ResizeObserver;
  
  // ThingsBoard example properties
  private DEBUG = true;
  private CHART_VERSION = "1.2";
  private currentConfig: any;
  private containerHeightLimit = [1000, 1200];
  private currentSize = "small";
  private maxGrids = 0;
  private setGrids = new Set<string>();
  private currentGrids = 3;
  private currentGridNames: string[] = [];
  private resetGrid = false;
  private usedFormatter: any;
  
  // Time formatters
  private zoomTimeWithSeconds = 60 * 60 * 1000;       // 1 day
  private zoomTimeWithMinutes = 7 * 24 * 60 * 60 * 1000;  // 7 days 
  private zoomTimeWithDays = 60 * 24 * 60 * 60 * 1000;   // 60 days
  
  // Formatter configurations
  private browserLocale = Intl.DateTimeFormat().resolvedOptions().timeZone.startsWith('Europe/') ? "en-GB" : navigator.language || (navigator as any).userLanguage;
  
  ngOnInit(): void {
    this.LOG(`=== CHART VERSION ${this.CHART_VERSION} INITIALIZATION START ===`);
    this.LOG('Component initialized');
    this.LOG('Widget context:', this.ctx);
    this.LOG('Widget settings:', this.ctx.settings);
    
    // Initialize debug output first
    this.DEBUG = this.ctx.settings.debugOutput;
    
    // Log data series details
    this.LOG('=== DATA SERIES ANALYSIS ===');
    this.LOG('Total data series:', this.ctx.data?.length || 0);
    
    if (this.ctx.data && this.ctx.data.length > 0) {
      this.ctx.data.forEach((item: any, index: number) => {
        const axisAssignment = item?.dataKey?.settings?.axisAssignment;
        this.LOG(`Series[${index}]:`, {
          label: item?.dataKey?.label || 'UNDEFINED',
          axisAssignment: axisAssignment || 'NOT SET',
          hasSettings: !!item?.dataKey?.settings,
          dataKeyStructure: item?.dataKey ? Object.keys(item.dataKey) : 'NO DATAKEY',
          settingsStructure: item?.dataKey?.settings ? Object.keys(item.dataKey.settings) : 'NO SETTINGS'
        });
      });
    } else {
      this.LOG('WARNING: No data series available!');
    }
    
    // Setup menu buttons
    this.ctx.$scope.menuButtons = (buttonName: string) => {
      switch (buttonName) {
        case 'genImage':
          this.LOG("Picture Button clicked!");
          this.downloadChartImage();
          break;
        case 'reset':
          this.resetChartCompletely();
          break;
      }
    };
    
    // Override CSV export functionality
    this.overrideCsvExport();
    
    this.currentConfig = this.isContainerHeight();
    this.LOG('Container config:', this.currentSize);
    
    // Count grids by settings
    this.LOG('=== GRID CALCULATION ===');
    this.LOG('axisPositionMap:', axisPositionMap);
    this.setGrids = this.countGridsBySettings(Object.keys(axisPositionMap));
    this.LOG('setGrids (unique axis assignments):', Array.from(this.setGrids));
    
    this.currentGridNames = Array.from(this.setGrids);
    this.maxGrids = this.setGrids.size;
    this.currentGrids = this.maxGrids;
    
    this.LOG('GRID RESULTS:');
    this.LOG('- currentGridNames:', this.currentGridNames);
    this.LOG('- maxGrids:', this.maxGrids);
    this.LOG('- currentGrids:', this.currentGrids);
    this.LOG(`=== CHART VERSION ${this.CHART_VERSION} INITIALIZATION END ===`);
  }

  ngAfterViewInit(): void {
    this.LOG('[ECharts Line Chart] AfterViewInit - Chart container:', this.chartContainer.nativeElement);
    this.LOG(`[HEIGHT DEBUG] ngAfterViewInit - ctx.height: ${this.ctx.height}, ctx.width: ${this.ctx.width}`);
    
    // Don't apply height here - let initChart handle it
    
    // Delay initialization to ensure layout is complete
    setTimeout(() => {
      this.LOG(`[HEIGHT DEBUG] After timeout - ctx.height: ${this.ctx.height}`);
      this.initChart();
      this.setupResizeObserver();
    }, 100);
  }

  ngOnDestroy(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    if (this.chart) {
      this.chart.off('legendselectchanged');
      this.chart.dispose();
    }
    // Restore original saveAs if we overrode it
    if ((window as any).saveAs && (window as any).saveAs._original) {
      (window as any).saveAs = (window as any).saveAs._original;
    }
  }

  public onDataUpdated(): void {
    this.LOG(`=== DATA UPDATE (v${this.CHART_VERSION}) ===`);
    this.LOG('Chart instance exists:', !!this.chart);
    this.LOG('Data series count:', this.ctx.data?.length || 0);
    
    if (!this.chart || !this.ctx.data) {
      this.LOG('ERROR: Missing chart instance or data');
      return;
    }

    this.currentConfig = this.isContainerHeight();
    
    const myNewOptions: any = {};
    myNewOptions.series = [];
    
    this.LOG('=== SERIES CREATION ===');
    this.LOG('Grid configuration:', {
      currentGrids: this.currentGrids,
      maxGrids: this.maxGrids,
      currentGridNames: this.currentGridNames
    });
    
    // Process each data series
    for (let i = 0; i < this.ctx.data.length; i++) {
      // Default to 'Top' if axisAssignment is not set
      const axisAssignment = this.ctx.data[i].dataKey?.settings?.axisAssignment || 'Top';
      const gridIndex = axisPositionMap[axisAssignment];
      const actualXAxisIndex = gridIndex > (this.currentGrids - 1) ? (this.currentGrids - 1) : gridIndex;
      const actualYAxisIndex = gridIndex > (this.currentGrids - 1) ? (this.currentGrids - 1) : gridIndex;
      
      this.LOG(`Series[${i}] "${this.ctx.data[i].dataKey.label}":`, {
        axisAssignment: axisAssignment || 'UNDEFINED',
        mappedGridIndex: gridIndex !== undefined ? gridIndex : 'UNDEFINED',
        actualXAxisIndex: actualXAxisIndex,
        actualYAxisIndex: actualYAxisIndex,
        dataPoints: this.ctx.data[i].data?.length || 0
      });
      
      const seriesElement = {
        name: this.ctx.data[i].dataKey.label,
        itemStyle: {
          normal: {
            color: this.ctx.data[i].dataKey.color,
          }
        },
        lineStyle: {
          width: (axisAssignment === 'Middle') 
            ? this.currentConfig.seriesElement.lineStyle.widthMiddle 
            : this.currentConfig.seriesElement.lineStyle.width
        },
        type: 'line',
        xAxisIndex: actualXAxisIndex,
        yAxisIndex: actualYAxisIndex,
        data: this.ctx.data[i].data,
        symbol: (this.ctx.settings.showDataPoints) ? 'circle' : 'none',
        symbolSize: (this.ctx.settings.symbolSize_data || 5) * 2.5, // Increase size by 2.5x to match original
        smooth: this.ctx.settings.smooth
      };
      myNewOptions.series.push(seriesElement);
    }
    
    this.setTimeFormatter();
    myNewOptions.xAxis = this.currentXAxisArray();
    myNewOptions.yAxis = this.currentYAxisArray();
    myNewOptions.grid = this.currentGridArray();
    myNewOptions.dataZoom = this.getDataZoomConfig(); // Update datazoom based on current grid config
    
    this.LOG("myNewOptions:", myNewOptions);
    
    // Initialize the chart
    this.chart.setOption(myNewOptions);
    
    if (this.resetGrid) {
      // Workaround for grid update
      const myTemp = this.chart.getOption() as any;
      this.LOG("Reseting GRID:", myTemp);
      myTemp.xAxis[this.currentGrids - 1].show = true;
      myTemp.xAxis[this.currentGrids - 1].splitLine.show = true;
      
      const tempUnits = this.getGridUnitsByData();
      for(let i = 0; i < myTemp.yAxis.length; i++){
        myTemp.yAxis[i].axisLabel.formatter = ('{value} ' + tempUnits[i]) || '';
      }
      this.chart.setOption(myTemp);
      this.resetGrid = false;
    }
  }

  public onResize(): void {
    this.LOG("ONRESIZE!!!");
    this.LOG(`[HEIGHT DEBUG] onResize triggered - ctx.height: ${this.ctx.height}, ctx.width: ${this.ctx.width}`);
    
    // Update chart container height, not the outer container
    const container = this.chartContainer.nativeElement;
    const containerElement = container.querySelector('#echartContainer') as HTMLElement;
    
    if (containerElement && this.ctx.height) {
      const buttonBarHeight = 50; // Button container takes about 50px
      const availableHeight = this.ctx.height - buttonBarHeight;
      containerElement.style.height = `${availableHeight}px`;
      this.LOG(`[HEIGHT DEBUG] Resized chart container to ${availableHeight}px`);
    }
    
    if (this.chart) {
      this.LOG(`[HEIGHT DEBUG] Calling chart.resize()`);
      this.chart.resize();
    }
    
    const oldSize = this.currentSize;
    this.currentConfig = this.isContainerHeight();
    
    if (oldSize !== this.currentSize) {
      this.LOG(`[HEIGHT DEBUG] Size changed from ${oldSize} to ${this.currentSize} - updating chart`);
    }
    
    this.onDataUpdated();
  }

  private initChart(): void {
    this.LOG('[ECharts Line Chart] Initializing chart');
    
    const container = this.chartContainer.nativeElement;
    const containerElement = container.querySelector('#echartContainer') as HTMLElement;
    
    if (!containerElement) {
      this.LOG('[ECharts Line Chart] echartContainer element not found!');
      return;
    }
    
    // Set height for chart container to account for button bar
    if (this.ctx.height) {
      const buttonBarHeight = 50; // Button container takes about 50px
      const availableHeight = this.ctx.height - buttonBarHeight;
      containerElement.style.height = `${availableHeight}px`;
      containerElement.style.width = '100%';
      this.LOG(`[HEIGHT DEBUG] Set chart container height to ${availableHeight}px (ctx.height: ${this.ctx.height} - buttonBar: ${buttonBarHeight})`);
    }
    
    this.chart = echarts.init(containerElement);
    this.LOG('[ECharts Line Chart] Chart instance created:', !!this.chart);
    
    this.setTimeFormatter();
    this.initChartAndGrid();
  }

  private initChartAndGrid(): void {
    this.LOG(`=== INIT CHART AND GRID (v${this.CHART_VERSION}) ===`);
    this.LOG('Current grid configuration:', {
      currentGrids: this.currentGrids,
      maxGrids: this.maxGrids,
      currentGridNames: this.currentGridNames
    });
    
    const option = this.getInitConfig();
    
    this.LOG('Building axis arrays...');
    option.xAxis = this.currentXAxisArray();
    this.LOG('xAxis configuration:', option.xAxis);
    
    option.yAxis = this.currentYAxisArray();
    this.LOG('yAxis configuration:', option.yAxis);
    
    option.grid = this.currentGridArray();
    this.LOG('grid configuration:', option.grid);
    
    this.LOG('Setting chart option with grid config...');
    this.chart.setOption(option);
    
    // Register legend selection event listener
    this.chart.on('legendselectchanged', (event: any) => {
      this.onLegendSelectChanged(event);
    });
    
    this.LOG('=== INIT CHART AND GRID COMPLETE ===');
  }

  private onLegendSelectChanged(event: any): void {
    const selected = event.selected;
    const selectedKeys = Object.keys(selected).filter(key => selected[key]);
    
    this.LOG("selected:", selected);
    this.LOG("selectedKeys:", selectedKeys);
    
    // Ensure at least one entry is selected
    if (selectedKeys.length === 0) {
      const lastSelected = event.name;
      const updatedSelected = { ...selected, [lastSelected]: true };
      
      this.chart.setOption({
        legend: {
          selected: updatedSelected
        }
      });
      return;
    }

    if (!this.checkDataGridByName(selectedKeys).has(AXIS_POSITION_NAMES['TOP'])) {
      const lastSelected = event.name;
      const updatedSelected = { ...selected, [lastSelected]: true };
      
      this.chart.setOption({
        legend: {
          selected: updatedSelected
        }
      });
      return;
    }
    
    const oldGridNr = this.currentGrids;
    this.setDataGridByNames(selectedKeys);
    
    if (oldGridNr != this.currentGrids) {
      this.LOG("Different Grid number --> RESET CHART!!!!");
      this.resetGrid = true;
      this.onResize();
    }
  }

  private setupResizeObserver(): void {
    this.LOG('[HEIGHT DEBUG] Setting up ResizeObserver');
    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        this.LOG(`[HEIGHT DEBUG] ResizeObserver triggered - contentRect: width=${width}, height=${height}`);
        if (width > 0 && height > 0) {
          this.LOG('[ECharts Line Chart] Container resized:', { width, height });
          this.LOG(`[HEIGHT DEBUG] Before resize - ctx.height: ${this.ctx.height}`);
          this.onResize();
          this.LOG(`[HEIGHT DEBUG] After resize - ctx.height: ${this.ctx.height}`);
        }
      }
    });
    this.resizeObserver.observe(this.chartContainer.nativeElement);
    this.LOG('[HEIGHT DEBUG] ResizeObserver attached to chart container');
  }

  private downloadChartImage(): void {
    const img = new Image();
    img.src = this.chart.getDataURL({
      type: 'png',
      pixelRatio: 7,
      backgroundColor: '#fff'
    });

    const link = document.createElement('a');
    link.href = img.src;
    link.download = 'chart-image.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  private exportDataToCsv(): void {
    if (!this.ctx.data || this.ctx.data.length === 0) {
      console.warn('[Chart Widget] No data available for CSV export');
      return;
    }
    
    this.LOG('[Chart Widget] Exporting data to CSV with custom filename');
    
    let csvContent = '';
    
    // Create header row
    const headers = ['Timestamp'];
    this.ctx.data.forEach((series) => {
      const seriesName = series.dataKey.label || series.dataKey.name;
      headers.push(seriesName);
    });
    csvContent += headers.join(',') + '\n';
    
    // Find all unique timestamps
    const timestampMap = new Map<number, any>();
    
    // Collect all data points by timestamp
    this.ctx.data.forEach((series) => {
      if (series.data) {
        series.data.forEach((point) => {
          const timestamp = point[0];
          const value = point[1];
          
          if (!timestampMap.has(timestamp)) {
            timestampMap.set(timestamp, {});
          }
          
          const seriesName = series.dataKey.label || series.dataKey.name;
          timestampMap.get(timestamp)[seriesName] = value;
        });
      }
    });
    
    // Sort timestamps
    const sortedTimestamps = Array.from(timestampMap.keys()).sort((a, b) => a - b);
    
    // Create data rows
    sortedTimestamps.forEach((timestamp) => {
      const row = [new Date(timestamp).toISOString()];
      const dataPoint = timestampMap.get(timestamp);
      
      this.ctx.data.forEach((series) => {
        const seriesName = series.dataKey.label || series.dataKey.name;
        const value = dataPoint[seriesName];
        
        if (value !== undefined) {
          const decimals = series.dataKey.decimals || this.ctx.decimals || 2;
          row.push(value.toFixed(decimals));
        } else {
          row.push('');
        }
      });
      
      csvContent += row.join(',') + '\n';
    });
    
    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const filename = 'Hello_Thomas.csv';
    
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
    
    this.LOG('[Chart Widget] CSV export completed with filename:', filename);
  }

  public exportData(format: 'csv' | 'xls' | 'xlsx'): void {
    this.LOG(`[Chart Widget] Exporting data in ${format.toUpperCase()} format`);
    
    if (!this.ctx.data || this.ctx.data.length === 0) {
      console.warn('[Chart Widget] No data available for export');
      return;
    }
    
    // Prepare data structure (original approach)
    const headers = ['Timestamp'];
    this.ctx.data.forEach((series) => {
      const seriesName = series.dataKey.label || series.dataKey.name;
      headers.push(seriesName);
    });
    
    // Collect all data points by timestamp
    const timestampMap = new Map<number, any>();
    this.ctx.data.forEach((series) => {
      if (series.data) {
        series.data.forEach((point) => {
          const timestamp = point[0];
          const value = point[1];
          
          if (!timestampMap.has(timestamp)) {
            timestampMap.set(timestamp, {});
          }
          
          const seriesName = series.dataKey.label || series.dataKey.name;
          timestampMap.get(timestamp)[seriesName] = value;
        });
      }
    });
    
    // Sort timestamps
    const sortedTimestamps = Array.from(timestampMap.keys()).sort((a, b) => a - b);
    
    // Create data rows (original approach)
    const dataRows = [];
    sortedTimestamps.forEach((timestamp) => {
      const row = [new Date(timestamp).toISOString()];
      const dataPoint = timestampMap.get(timestamp);
      
      this.ctx.data.forEach((series) => {
        const seriesName = series.dataKey.label || series.dataKey.name;
        const value = dataPoint[seriesName];
        
        if (value !== undefined) {
          const decimals = series.dataKey.decimals || this.ctx.decimals || 2;
          row.push(value.toFixed(decimals));
        } else {
          row.push('');
        }
      });
      
      dataRows.push(row);
    });
    
    const filename = 'Hello_Thomas';
    
    if (format === 'csv') {
      // Export as CSV with semicolon separator (ThingsBoard format)
      let csvContent = headers.join(';') + '\n';
      dataRows.forEach(row => {
        csvContent += row.join(';') + '\n';
      });
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      this.downloadFile(blob, `${filename}.csv`);
      
    } else if (format === 'xls') {
      // Export as HTML table with Excel markup (ThingsBoard style)
      const sheetName = filename.replace(/[^a-zA-Z0-9_]/g, '_');
      
      let htmlContent = '<html xmlns:o="urn:schemas-microsoft-com:office:office" ' +
                       'xmlns:x="urn:schemas-microsoft-com:office:excel" ' +
                       'xmlns="http://www.w3.org/TR/REC-html40">\n';
      htmlContent += '<meta http-equiv="content-type" content="application/vnd.ms-excel; charset=UTF-8"/>\n';
      htmlContent += '<head><!--[if gte mso 9]><xml>\n';
      htmlContent += '<x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>';
      htmlContent += `<x:Name>${sheetName}</x:Name>`;
      htmlContent += '<x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>';
      htmlContent += '</x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook>';
      htmlContent += '</xml><![endif]--></head>\n';
      htmlContent += '<body><table>';
      
      // Add headers
      htmlContent += '<tr>';
      headers.forEach(header => {
        htmlContent += `<td><b>${header}</b></td>`;
      });
      htmlContent += '</tr>';
      
      // Add data rows
      dataRows.forEach(row => {
        htmlContent += '<tr>\n';
        row.forEach(cell => {
          htmlContent += `                <td>${cell}</td>`;
        });
        htmlContent += '\n            </tr>';
      });
      
      htmlContent += '</table></body></html>';
      
      const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel' });
      this.downloadFile(blob, `${filename}.xls`);
      
    } else if (format === 'xlsx') {
      // Export as modern Excel with binary format matching ThingsBoard
      const worksheet_data = [headers, ...dataRows];
      const worksheet = XLSX.utils.aoa_to_sheet(worksheet_data);
      
      // Apply header styling (bold, background color)
      const headerRange = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
      for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
        const cellRef = XLSX.utils.encode_cell({ r: 0, c: col });
        if (worksheet[cellRef]) {
          worksheet[cellRef].s = {
            font: { bold: true, color: { rgb: "000000" } },
            fill: { fgColor: { rgb: "E0E0E0" } },
            alignment: { horizontal: "center", vertical: "center" }
          };
        }
      }
      
      // Apply number formatting to data cells
      for (let row = 1; row <= dataRows.length; row++) {
        for (let col = 1; col < headers.length; col++) { // Skip timestamp column
          const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
          if (worksheet[cellRef] && worksheet[cellRef].v !== '') {
            // Apply number format for numeric values
            worksheet[cellRef].t = 'n'; // Set type to number
            worksheet[cellRef].z = '0.000000'; // Number format with 6 decimals
          }
        }
      }
      
      // Calculate dynamic column widths based on content (matching ThingsBoard)
      const columnWidths = headers.map((header, index) => {
        // Find max width for this column
        let maxWidth = header.length;
        dataRows.forEach(row => {
          const cellValue = row[index];
          if (cellValue && cellValue.toString().length > maxWidth) {
            maxWidth = cellValue.toString().length;
          }
        });
        // Add some padding and set min/max bounds like ThingsBoard
        return { wch: Math.min(Math.max(maxWidth + 2, 10), 50) };
      });
      worksheet['!cols'] = columnWidths;
      
      // Add autofilter to the data range
      worksheet['!autofilter'] = { ref: worksheet['!ref'] || 'A1:A1' };
      
      // Get widget name from context for sheet name (like ThingsBoard)
      let sheetName = 'Chart Data'; // Default fallback
      if (this.ctx && this.ctx.widgetTitle) {
        // Clean sheet name to be Excel-compatible (max 31 chars, no special chars)
        sheetName = this.ctx.widgetTitle
          .replace(/[/\\?*[\]]/g, '_') // Replace invalid chars
          .substring(0, 31); // Excel sheet name limit
      } else if (this.ctx && this.ctx.widgetConfig && this.ctx.widgetConfig.title) {
        sheetName = this.ctx.widgetConfig.title
          .replace(/[/\\?*[\]]/g, '_')
          .substring(0, 31);
      }
      
      // Create workbook with ThingsBoard-style metadata
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
      
      // Set workbook properties to match ThingsBoard
      workbook.Props = {
        Title: sheetName,
        Subject: 'ThingsBoard Chart Data Export',
        Author: 'ThingsBoard',
        Manager: 'ThingsBoard Platform',
        Company: 'ThingsBoard',
        Category: 'IoT Data',
        Keywords: 'ThingsBoard, IoT, Time Series',
        Comments: `Exported from ${sheetName} widget`,
        CreatedDate: new Date(),
        ModifiedDate: new Date(),
        Application: 'ThingsBoard Platform',
        AppVersion: '3.0'
      };
      
      // Add workbook view settings
      if (!workbook.Workbook) workbook.Workbook = {};
      if (!workbook.Workbook.Views) workbook.Workbook.Views = [];
      workbook.Workbook.Views[0] = {
        RTL: false
      };
      
      // Write workbook with optimized settings matching ThingsBoard
      const excelBuffer = XLSX.write(workbook, { 
        bookType: 'xlsx', 
        type: 'array',
        bookSST: true, // Use shared strings table like ThingsBoard
        compression: true, // Enable compression
        Props: workbook.Props,
        cellDates: false, // Keep dates as strings like ThingsBoard
        cellStyles: true // Include cell styles
      });
      
      const blob = new Blob([excelBuffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      this.downloadFile(blob, `${filename}.xlsx`);
    }
    
    this.LOG(`[Chart Widget] Export completed: ${filename}.${format}`);
  }
  
  private downloadFile(blob: Blob, filename: string): void {
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  }

  private overrideCsvExport(): void {
    // Monitor for dynamic saveAs calls
    const checkInterval = setInterval(() => {
      if ((window as any).saveAs && !(window as any).saveAs._customOverride) {
        const originalSaveAs = (window as any).saveAs;
        
        (window as any).saveAs = function(blob: Blob, filename: string) {
          if (filename && (filename.endsWith('.csv') || filename.toLowerCase().includes('export'))) {
            console.log('[Chart Widget] Persistent saveAs override triggered');
            return originalSaveAs.call(this, blob, 'Hello_Thomas.csv');
          }
          return originalSaveAs.call(this, blob, filename);
        };
        
        (window as any).saveAs._customOverride = true;
        (window as any).saveAs._original = originalSaveAs;
      }
    }, 500);
    
    // Clean up interval on widget destroy
    const originalDestroy = this.ngOnDestroy.bind(this);
    this.ngOnDestroy = () => {
      clearInterval(checkInterval);
      if ((window as any).saveAs && (window as any).saveAs._original) {
        (window as any).saveAs = (window as any).saveAs._original;
      }
      originalDestroy();
    };
  }

  private resetChartCompletely(keepGrids = false): void {
    this.chart.clear();
    if (!keepGrids) {
      this.currentGrids = this.maxGrids;
    }
    this.initChartAndGrid();
    this.onDataUpdated();
  }

  private resetZoom(): void {
    this.chart.dispatchAction({
      type: 'dataZoom',
      start: 0,
      end: 100
    });
  }

  // Helper methods from ThingsBoard example
  public menuButtons(buttonName: string): void {
    switch (buttonName) {
      case 'genImage':
        this.LOG("Picture Button clicked!!!!");
        this.downloadChartImage();
        break;
      case 'reset':
        this.resetChartCompletely();
        break;
      case 'exportCsv':
        this.LOG("CSV Export Button clicked!!!!");
        this.exportDataToCsv();
        break;
    }
  }

  private isContainerHeight(): any {
    this.LOG(`[HEIGHT DEBUG] ctx.height: ${this.ctx.height}, limits: [${this.containerHeightLimit[0]}, ${this.containerHeightLimit[1]}]`);
    
    if ((this.ctx.height >= this.containerHeightLimit[0]) && 
        (this.ctx.height < this.containerHeightLimit[1])) {
      this.LOG("isContainerHeight:", "LARGE!!!");
      this.LOG(`[HEIGHT DEBUG] Selected LARGE config (height ${this.ctx.height} is between ${this.containerHeightLimit[0]} and ${this.containerHeightLimit[1]})`);
      this.currentSize = SIZE_NAMES.LARGE;
      return this.ifLargeContainerConfig();
    } else if (this.ctx.height >= this.containerHeightLimit[1]) {
      this.LOG("isContainerHeight:", "HUGE!!!");
      this.LOG(`[HEIGHT DEBUG] Selected HUGE config (height ${this.ctx.height} >= ${this.containerHeightLimit[1]})`);
      this.currentSize = SIZE_NAMES.HUGE;
      return this.ifHugeContainerConfig();
    }
    this.LOG("isContainerHeight:", "Small!!!");
    this.LOG(`[HEIGHT DEBUG] Selected SMALL config (height ${this.ctx.height} < ${this.containerHeightLimit[0]})`);
    this.currentSize = SIZE_NAMES.SMALL;
    return this.ifSmallContainerConfig();
  }

  private currentGridArray(): any[] {
    this.LOG('currentGridArray called with currentGrids:', this.currentGrids, 'currentSize:', this.currentSize);
    let gridArray = [];
    
    switch(this.currentGrids) {
      case 1:
        gridArray = this.gridConfig().singleGrid[this.currentSize].map(entry => ({ ...entry }));
        break;
      case 2:
        gridArray = this.gridConfig().doubleGrid[this.currentSize].map(entry => ({ ...entry }));
        break;
      case 3:
        gridArray = this.gridConfig().tripleGrid[this.currentSize].map(entry => ({ ...entry }));
        break;
    }
    
    this.LOG('Grid array configuration:', gridArray);
    return gridArray;
  }

  private currentXAxisArray(): any[] {
    const myXAxisArray = [];
    
    myXAxisArray.push({
      type: 'time',
      gridIndex: 0,
      splitLine: {
        show: true,
        lineStyle: {
          width: this.currentConfig.option.yAxis.splitLine.lineStyle.width
        }
      },
      axisLine: { onZero: false },
      position: 'bottom',
      axisLabel: {
        show: true,
        fontSize: this.currentConfig.option.xAxis.axisLabel.fontSize,
        fontWeight: this.currentConfig.option.xAxis.axisLabel.fontWeight,
        hideOverlap: true,
        formatter: (value, index) => {
          switch (this.usedFormatter.id) {
            case 'months':
            case 'days':
              return index === 0 
                ? this.firstLabelFormatterWithDays().format(value).replace(",", ",\n") 
                : this.usedFormatter.formatter.format(value).replace(",", ",\n");
            case 'minutes':
              return index === 0 
                ? this.firstLabelFormatterWithMinutes().format(value).replace(",", ",\n") 
                : this.usedFormatter.formatter.format(value).replace(",", ",\n");
            case 'seconds':
              return index === 0 
                ? this.firstLabelFormatterWithSeconds().format(value).replace(",", ",\n") 
                : this.usedFormatter.formatter.format(value).replace(",", ",\n");
          }
        },
        rotate: this.currentConfig.option.xAxis.rotate,
        align: 'right',
        margin: this.currentConfig.option.xAxis.margin,
        showMinLabel: true,
        showMaxLabel: true
      },
      min: this.ctx.timeWindow.minTime,
      max: this.ctx.timeWindow.maxTime,
    });
    
    if (this.maxGrids > 1) {
      myXAxisArray.push({
        type: 'time',
        gridIndex: 1,
        show: false
      });
    }
    if (this.maxGrids > 2) {
      myXAxisArray.push({
        type: 'time',
        gridIndex: 2,
        show: false
      });
    }
    
    if (this.currentGrids > 1) {
      myXAxisArray[1] = {...myXAxisArray[0]};
      myXAxisArray[1].gridIndex = 1;
    }
    if (this.currentGrids > 2) {
      myXAxisArray[2] = {
        type: 'time',
        show: true,
        gridIndex: 2,
        axisTick: { alignWithLabel: true },
        splitLine: {
          show: true,
          lineStyle: {
            width: this.currentConfig.option.xAxis.splitLine.lineStyle.width
          }
        },
        axisLabel: { show: false },
        axisLine: { onZero: false },
        position: 'top',
        min: this.ctx.timeWindow.minTime,
        max: this.ctx.timeWindow.maxTime,
      };
    }
    return myXAxisArray;
  }

  private currentYAxisArray(): any[] {
    const myYAxisArray = [];
    const tempUnits = this.getGridUnitsByData();
    this.LOG("currentXAxisArray getGridUnitsByData:", tempUnits);
    
    myYAxisArray.push({
      type: 'value',
      scale: true,
      splitNumber: this.currentConfig.option.yAxis.splitNumber,
      name: this.ctx.settings.yAxisLeftTitle || '',
      axisLabel: {
        formatter: '{value} ' + (tempUnits[0] || ""),
        color: this.ctx.settings.legendcolortext,
        fontSize: this.currentConfig.option.yAxis.axisLabel.fontSize,
        fontWeight: this.currentConfig.option.yAxis.axisLabel.fontWeight,
        showMinLabel: true,
        showMaxLabel: true
      },
      splitLine: {
        show: true,
        lineStyle: {
          width: this.currentConfig.option.yAxis.splitLine.lineStyle.width
        }
      },
      gridIndex: 0,
    });
    
    if (this.maxGrids > 1) {
      myYAxisArray.push({
        type: 'value',
        gridIndex: 1,
        show: false
      });
    }
    if (this.maxGrids > 2) {
      myYAxisArray.push({
        type: 'value',
        gridIndex: 2,
        show: false
      });
    }
    
    if (this.currentGrids > 1) {
      myYAxisArray[1] = {
        type: 'value',
        scale: true,
        show: true,
        splitNumber: this.currentConfig.option.yAxis.splitNumber,
        alignTicks: true,
        name: this.ctx.settings.yAxisRightTitle || '',
        axisLabel: {
          formatter: '{value} ' + (tempUnits[1] || ''),
          fontSize: this.currentConfig.option.yAxis.axisLabel.fontSize,
          fontWeight: this.currentConfig.option.yAxis.axisLabel.fontWeight,
          show: true,
          showMaxLabel: true,
        },
        splitLine: {
          show: true,
          lineStyle: {
            width: this.currentConfig.option.yAxis.splitLine.lineStyle.width
          }
        },
        gridIndex: 1
      };
    }
    if (this.currentGrids > 2) {
      myYAxisArray[2] = {
        type: 'value',
        show: true,
        scale: true,
        splitNumber: this.currentConfig.option.yAxis.splitNumber,
        alignTicks: true,
        name: this.ctx.settings.yAxisRightTitle || '',
        axisLabel: {
          formatter: '{value} ' + (tempUnits[2] || ""),
          fontSize: this.currentConfig.option.yAxis.axisLabel.fontSize,
          fontWeight: this.currentConfig.option.yAxis.axisLabel.fontWeight,
          show: true,
          showMaxLabel: true,
        },
        splitLine: {
          show: true,
          lineStyle: {
            width: this.currentConfig.option.yAxis.splitLine.lineStyle.width
          }
        },
        gridIndex: 2
      };
    }
    return myYAxisArray;
  }

  private checkDataGridByName(selectedKeys: string[]): Set<string> {
    const matchedValues = selectedKeys.map(key => {
      const foundObject = this.ctx.data.find(obj => obj.dataKey.label === key);
      // Default to 'Top' if no assignment is set
      return foundObject ? (foundObject.dataKey.settings?.axisAssignment || 'Top') : null;
    });
    this.LOG("matchedValues:", matchedValues);
    
    const uniqueMatches = new Set(matchedValues.filter(item => item && Object.prototype.hasOwnProperty.call(axisPositionMap, item)));
    this.LOG("uniqueMatches:", uniqueMatches, ", len:", uniqueMatches.size);
    return uniqueMatches;
  }

  private setDataGridByNames(selectedKeys: string[]): void {
    this.currentGridNames = Array.from(this.checkDataGridByName(selectedKeys));
    this.currentGrids = this.currentGridNames.length;
    this.LOG("setDataGridByNames:", this.currentGrids, " -> ", this.currentGridNames);
  }

  private countGridsBySettings(selectedKeys: string[]): Set<string> {
    this.LOG('countGridsBySettings called with keys:', selectedKeys);
    
    // Collect all unique axisAssignment values from the data
    const axisAssignments = this.ctx.data
      .map((item, index) => {
        // Default to 'Top' if no assignment is set
        const assignment = item.dataKey?.settings?.axisAssignment || 'Top';
        this.LOG(`  - Data[${index}] axisAssignment:`, assignment, 
                 'Valid:', Object.prototype.hasOwnProperty.call(axisPositionMap, assignment));
        return assignment;
      })
      .filter(assignment => Object.prototype.hasOwnProperty.call(axisPositionMap, assignment));
    
    this.LOG('Filtered valid assignments:', axisAssignments);
    const uniqueAssignments = new Set(axisAssignments);
    this.LOG('Unique assignments:', Array.from(uniqueAssignments));
    
    return uniqueAssignments;
  }

  private getGridUnitsByData(): string[] {
    if (this.currentGridNames && (this.currentGridNames.length > 0)) {
      return this.currentGridNames.map(key => {
        return this.getDataUnitForGrid(key);
      }) || [];
    }
    return ["", "", ""];
  }

  private getDataUnitForGrid(gridName: string): string {
    const found = this.ctx.data.find(item => 
      item.dataKey?.settings?.axisAssignment === gridName
    );
    return found?.dataKey?.units || "";
  }

  private setTimeFormatter(): void {
    try {
      if (!this.ctx.data || !this.ctx.data[0] || !this.ctx.data[0].data || this.ctx.data[0].data.length === 0) {
        this.usedFormatter = this.zoomFormatterWithMinutes();
        return;
      }
      
      const myData = this.ctx.data[0].data;
      const minTime = myData[0][0];
      const maxTime = myData[myData.length - 1][0];
      const totalTimeSpan = maxTime - minTime;
      
      if (totalTimeSpan <= this.zoomTimeWithSeconds) {
        this.usedFormatter = this.zoomFormatterWithSeconds();
      } else if (totalTimeSpan <= this.zoomTimeWithMinutes) {
        this.usedFormatter = this.zoomFormatterWithMinutes();
      } else if (totalTimeSpan <= this.zoomTimeWithDays) {
        this.usedFormatter = this.zoomFormatterWithDays();
      } else {
        this.usedFormatter = this.zoomFormatterWithMonths();
      }
    } catch {
      this.usedFormatter = this.zoomFormatterWithMinutes();
    }
  }

  private getInitConfig(): any {
    return {
      legend: {
        type: "scroll",
        textStyle: {
          color: this.ctx.settings.legendcolortext || '#000000',
          fontWeight: this.currentConfig.option.legend.textStyle.fontWeight,
          fontSize: this.currentConfig.option.legend.textStyle.fontSize
        },
        itemWidth: this.currentConfig.option.legend.itemWidth,
        itemHeight: this.currentConfig.option.legend.itemHeight,
        itemGap: this.currentConfig.option.legend.itemGap,
        tooltip: {
          show: true,
          backgroundColor: 'rgba(50, 50, 50, 0.8)',
          textStyle: {
            color: '#fff'
          },
          borderColor: '#fff',
          borderWidth: 1,
          formatter: (params) => {
            return `Click "${params.name}" to hide or show data.`;
          }
        }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
          snap: true,
          link: [{
            xAxisIndex: 'all'
          }]
        },
        formatter: (params) => {
          let result = '';
          const legendOrder = this.ctx.data.map(item => item.dataKey.label);
          
          const paramsMap = {};
          params.forEach(item => {
            paramsMap[item.seriesName] = item;
          });
          
          let gridName = this.ctx.data[0].dataKey.settings.axisAssignment;
          
          try {
            for (let i = 0; i < legendOrder.length; i++) {
              const seriesName = legendOrder[i];
              
              if (i === 0) {
                if (paramsMap[seriesName]) {
                  result += `${this.firstLabelFormatterWithSeconds().format(paramsMap[seriesName].value[0])}<br>`;
                }
                result += `<table style="border-collapse: collapse; width: 100%; font-size: 12px;">`;
              }
              
              if (gridName != this.ctx.data[i].dataKey.settings.axisAssignment) {
                result += `<tr>
                            <td style="text-align: left; padding: 2px;"> </td>
                            <td style="text-align: right; padding: 2px;"> </td>
                            <td style="text-align: right; padding: 2px;"> <br> </td>
                          </tr>`;
                gridName = this.ctx.data[i].dataKey.settings.axisAssignment;
              }
              
              if (paramsMap[seriesName]) {
                const item = paramsMap[seriesName];
                const unit = this.ctx.data[i].dataKey?.units || "";
                const value = Number(item.value[1]).toFixed(this.ctx.decimals);
                
                result += `<tr>
                    <td style="text-align: left; padding: 2px;">${item.marker} ${item.seriesName}</td>
                    <td style="text-align: right; padding: 2px;">${value}</td>
                     <td style="text-align: right; padding: 2px;">${unit}</td>
                </tr>`;
              }
            }
          } catch {
            result = "";
          }
          
          return result;
        }
      },
      axisPointer: {
        link: [{
          xAxisIndex: 'all'
        }]
      },
      dataZoom: this.getDataZoomConfig()
    };
  }

  private getDataZoomConfig(): any[] {
    // DataZoom always at 92% as in original
    return [
      {
        show: true,
        xAxisIndex: 'all',
        type: 'slider',
        top: '92%',
        start: 0,
        end: 100
      },
      {
        type: 'inside',
        xAxisIndex: 'all',
        start: 0,
        end: 100
      }
    ];
  }

  // Utility methods
  private LOG(...args: any[]): void {
    if (this.DEBUG) {
      console.log("[sc chart v6.1 3sub production]", ...args);
    }
  }

  private LOGE(...args: any[]): void {
    if (this.DEBUG) {
      console.error("[sc chart v6.1 3sub production] ERROR:", ...args);
    }
  }

  // Configuration objects
  private gridConfig(): any {
    return {
      "singleGrid": {
        "small": [{
          "id": "main",
          "top": "8%",
          "left": "12%",
          "right": "1%",
          "height": "70%",
          "bottom": "2%"
        }],
        "large": [{
          "id": "main",
          "top": "5%",
          "left": "12%",
          "right": "1%",
          "height": "75%",
          "bottom": "2%"
        }],
        "huge": [{
          "id": "main",
          "top": "5%",
          "left": "10%",
          "right": "1%",
          "height": "75%",
          "bottom": "2%"
        }]
      },
      "doubleGrid": {
        "small": [
          {
            "id": "main",
            "top": "8%",
            "left": "12%",
            "right": "1%",
            "height": "30%"
          },
          {
            "id": "sub",
            "top": "50%",
            "left": "12%",
            "right": "1%",
            "bottom": "2%",
            "height": "30%"
          }
        ],
        "large": [
          {
            "id": "main",
            "top": "5%",
            "left": "10%",
            "right": "1%",
            "height": "35%"
          },
          {
            "id": "sub",
            "top": "50%",
            "left": "10%",
            "right": "1%",
            "bottom": "2%",
            "height": "35%"
          }
        ],
        "huge": [
          {
            "id": "main",
            "top": "5%",
            "left": "10%",
            "right": "1%",
            "height": "35%"
          },
          {
            "id": "sub",
            "top": "50%",
            "left": "10%",
            "right": "1%",
            "bottom": "2%",
            "height": "35%"
          }
        ]
      },
      "tripleGrid": {
        "small": [
          {
            "id": "main",
            "top": "5%",
            "left": "12%",
            "right": "1%",
            "height": "20%"
          },
          {
            "id": "sub",
            "top": "36%",
            "left": "12%",
            "right": "1%",
            "height": "20%"
          },
          {
            "id": "sub2",
            "top": "68%",
            "left": "12%",
            "right": "1%",
            "height": "20%"
          }
        ],
        "large": [
          {
            "id": "main",
            "top": "5%",
            "left": "10%",
            "right": "1%",
            "height": "20%"
          },
          {
            "id": "sub",
            "top": "36%",
            "left": "10%",
            "right": "1%",
            "height": "20%"
          },
          {
            "id": "sub2",
            "top": "68%",
            "left": "10%",
            "right": "1%",
            "bottom": "2%",
            "height": "20%"
          }
        ],
        "huge": [
          {
            "id": "main",
            "top": "5%",
            "left": "10%",
            "right": "1%",
            "height": "20%"
          },
          {
            "id": "sub",
            "top": "35%",
            "left": "10%",
            "right": "1%",
            "height": "20%"
          },
          {
            "id": "sub2",
            "top": "65%",
            "left": "10%",
            "right": "1%",
            "bottom": "10%",
            "height": "20%"
          }
        ]
      }
    };
  }

  // Formatter configurations
  private zoomFormatterWithMonths(): any {
    return {
      id: 'months',
      formatter: new Intl.DateTimeFormat(this.browserLocale, {
        year: '2-digit',
        month: '2-digit'
      })
    };
  }

  private zoomFormatterWithDays(): any {
    return {
      id: 'days',
      formatter: new Intl.DateTimeFormat(this.browserLocale, {
        year: '2-digit',
        month: '2-digit',
        day: '2-digit'
      })
    };
  }

  private zoomFormatterWithMinutes(): any {
    return {
      id: 'minutes',
      formatter: new Intl.DateTimeFormat(this.browserLocale, {
        hour: '2-digit',
        minute: '2-digit',
        month: '2-digit',
        day: '2-digit',
      })
    };
  }

  private zoomFormatterWithSeconds(): any {
    return {
      id: 'seconds',
      formatter: new Intl.DateTimeFormat(this.browserLocale, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    };
  }

  private firstLabelFormatterWithDays(): any {
    return new Intl.DateTimeFormat(this.browserLocale, {
      day: '2-digit',
      month: 'short',
      year: '2-digit',
    });
  }

  private firstLabelFormatterWithMinutes(): any {
    return new Intl.DateTimeFormat(this.browserLocale, {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: 'short',
      year: '2-digit',
    });
  }

  private firstLabelFormatterWithSeconds(): any {
    return new Intl.DateTimeFormat(this.browserLocale, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      day: '2-digit',
      month: 'short',
      year: '2-digit',
    });
  }

  private ifSmallContainerConfig(): any {
    return {
      "seriesElement": {
        "lineStyle": {
          "width": 4,
          "widthMiddle": 3
        },
        "markline": {
          "lineStyle": {
            "width": 2
          }
        }
      },
      "option": {
        "legend": {
          "textStyle": {
            "fontWeight": "bold",
            "fontSize": 14
          },
          "itemWidth": 40,
          "itemHeight": 12,
          "itemGap": 20,
        },
        "xAxis": {
          "splitLine": {
            "lineStyle": {
              "width": 2
            }
          },
          "axisLabel": {
            "fontSize": 14,
            "fontWeight": "normal"
          },
          "rotate": 40,
          "margin": 15
        },
        "yAxis": {
          "splitNumber": 3,
          "splitLine": {
            "lineStyle": {
              "width": 2
            }
          },
          "axisLabel": {
            "fontSize": 14,
            "fontWeight": "normal"
          }
        }
      }
    };
  }

  private ifLargeContainerConfig(): any {
    return {
      "seriesElement": {
        "lineStyle": {
          "width": 5,
          "widthMiddle": 4
        },
        "markline": {
          "lineStyle": {
            "width": 3
          }
        }
      },
      "option": {
        "legend": {
          "textStyle": {
            "fontWeight": "bold",
            "fontSize": 20
          },
          "itemWidth": 60,
          "itemHeight": 15,
          "itemGap": 20,
        },
        "xAxis": {
          "splitLine": {
            "lineStyle": {
              "width": 3
            }
          },
          "axisLabel": {
            "fontSize": 16,
            "fontWeight": 550
          },
          "rotate": 40,
          "margin": 20
        },
        "yAxis": {
          "splitNumber": 3,
          "splitLine": {
            "lineStyle": {
              "width": 3
            }
          },
          "axisLabel": {
            "fontSize": 16,
            "fontWeight": 550
          }
        }
      }
    };
  }

  private ifHugeContainerConfig(): any {
    return {
      "seriesElement": {
        "lineStyle": {
          "width": 5,
          "widthMiddle": 4
        },
        "markline": {
          "lineStyle": {
            "width": 3
          }
        }
      },
      "option": {
        "legend": {
          "textStyle": {
            "fontWeight": "bold",
            "fontSize": 24
          },
          "itemWidth": 70,
          "itemHeight": 20,
          "itemGap": 30,
        },
        "xAxis": {
          "splitLine": {
            "lineStyle": {
              "width": 3
            }
          },
          "axisLabel": {
            "fontSize": 18,
            "fontWeight": 550
          },
          "rotate": 40,
          "margin": 20
        },
        "yAxis": {
          "splitNumber": 4,
          "splitLine": {
            "lineStyle": {
              "width": 3
            }
          },
          "axisLabel": {
            "fontSize": 18,
            "fontWeight": 550
          }
        }
      }
    };
  }
}