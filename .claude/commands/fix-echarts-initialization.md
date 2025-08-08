/project: fix-echarts-initialization

Please analyze and fix the Angular `EchartsLineChartComponent` (shown below).

**Problem:**  
When there are many data points, the chart only renders after the container is resized or a legend item is toggled. We use `chart.setOption(..., true)` (merge mode) for smooth transitions and **must not disable merge**. We need the chart to always fully draw new data immediately after `onDataUpdated()`.

**Steps:**

1. **think harder**  
   - Investigate why ECharts isn’t painting all series until a resize/legend toggle.  
   - Consider lifecycle/timing issues or missing calls to force a reflow.

2. **plan**  
   - Outline a minimal patch (e.g. call `this.chart.resize()` or dispatch a render event after merging).  
   - Ensure it runs only after the merged option is applied and the DOM is stable.

3. **code**  
   - Update `onDataUpdated()` (or wherever you merge) to trigger a resize or explicit re-render.  
   - Keep `merge: true` and smooth transitions intact.

4. **commit**  
   - Commit with message:  
     ```
     fix: ensure ECharts always redraws after data update
     ```
