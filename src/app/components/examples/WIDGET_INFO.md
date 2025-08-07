# ThingsBoard Widget Transformation

This widget has been transformed to match the ThingsBoard example widget structure with the following features:

## Key Features:
1. **Multi-grid system**: Supports Top/Middle/Bottom axis assignment with dynamic grid management
2. **CSV Export**: Custom implementation that always exports with filename "Hello_Thomas.csv"
3. **Image Export**: Download chart as PNG image
4. **Reset Zoom**: Reset chart zoom to show all data
5. **Responsive Design**: Three size configurations (small/large/huge) based on container height

## File Structure:
- `echarts-line-chart.component.html` - Simplified HTML matching ThingsBoard widget structure
- `echarts-line-chart.component.scss` - ThingsBoard-style CSS
- `echarts-line-chart-widget.js` - Complete JavaScript implementation for ThingsBoard platform
- Original TypeScript component preserved in `echarts-line-chart.component.ts`

## CSV Export Override:
The widget includes multiple mechanisms to ensure CSV exports always use "Hello_Thomas.csv":
1. Custom exportDataToCsv() function
2. window.saveAs override
3. Persistent monitoring for dynamic saveAs calls
4. FileSaver.saveAs interception

## Usage in ThingsBoard:
1. Copy the content from `echarts-line-chart-widget.js` to your ThingsBoard widget editor
2. Copy HTML and CSS to respective sections
3. Configure data keys with axisAssignment: "Top", "Middle", or "Bottom"
4. The widget will automatically manage grids based on legend selection