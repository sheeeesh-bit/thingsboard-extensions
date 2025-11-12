
# Adding New Widgets to ThingsBoard Extensions

This guide explains how to create and add new custom widgets to this ThingsBoard Extension Widgets project.

## Table of Contents

1. [Project Structure](#project-structure)
2. [Creating a New Widget](#creating-a-new-widget)
3. [Adding Widget Settings](#adding-widget-settings)
4. [Adding Data Key Settings](#adding-data-key-settings)
5. [Registering Your Widget](#registering-your-widget)
6. [Building and Testing](#building-and-testing)
7. [Deploying to ThingsBoard](#deploying-to-thingsboard)
8. [Best Practices](#best-practices)

---

## Project Structure

```
src/app/
├── components/
│   ├── examples/              # Your widgets go here
│   │   ├── my-widget/        # Example widget folder
│   │   │   ├── my-widget.component.ts
│   │   │   ├── my-widget.component.html
│   │   │   ├── my-widget.component.scss
│   │   │   ├── settings/     # Widget settings UI
│   │   │   │   ├── my-widget-settings.component.ts
│   │   │   │   ├── my-widget-settings.component.html
│   │   │   │   └── my-widget-settings.component.scss
│   │   │   └── data-key-settings/  # Per-data-key settings
│   │   │       ├── my-widget-data-key-settings.component.ts
│   │   │       ├── my-widget-data-key-settings.component.html
│   │   │       └── my-widget-data-key-settings.component.scss
│   │   ├── examples.module.ts  # Register widgets here
│   │   └── public-api.ts      # Export widgets here
│   ├── interfaces/
│   │   └── widget.interfaces.ts  # TypeScript interfaces
│   └── services/              # Shared services
├── scss/                      # Shared styles
└── thingsboard-extension-widgets.module.ts
```

---

## Creating a New Widget

### Step 1: Generate Widget Component

Create a new folder for your widget in `src/app/components/examples/`:

```bash
mkdir -p src/app/components/examples/my-widget
cd src/app/components/examples/my-widget
```

### Step 2: Create Component Files

**`my-widget.component.ts`:**

```typescript
import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnInit,
  ViewChild,
  OnDestroy
} from '@angular/core';
import { WidgetContext } from '@home/models/widget-component.models';

@Component({
  selector: 'tb-my-widget',
  templateUrl: './my-widget.component.html',
  styleUrls: ['./my-widget.component.scss']
})
export class MyWidgetComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('widgetContainer', {static: false}) widgetContainer: ElementRef<HTMLElement>;
  @Input() ctx: WidgetContext;

  constructor() {}

  ngOnInit(): void {
    // Initialize widget settings
    console.log('Widget settings:', this.ctx.settings);
    console.log('Widget data:', this.ctx.data);
    console.log('Widget dimensions:', this.ctx.width, this.ctx.height);
  }

  ngAfterViewInit(): void {
    // Initialize your widget after view is ready
    this.initWidget();

    // CRITICAL: Expose component to ThingsBoard's widget.js bridge
    if (this.ctx.$scope) {
      this.ctx.$scope.myWidgetComponent = this;

      // Flush any pending updates from widget.js
      if (typeof this.ctx.$scope.componentReady === 'function') {
        this.ctx.$scope.componentReady();
      }
    }
  }

  ngOnDestroy(): void {
    // Clean up resources
    console.log('Widget destroyed');
  }

  private initWidget(): void {
    // Your widget initialization logic
    console.log('Initializing widget...');
  }

  // Called by ThingsBoard when data is updated
  public onDataUpdated(): void {
    // Check if we have real data
    const totalDataPoints = this.ctx.data?.reduce((sum, series) =>
      sum + (series.data?.length || 0), 0) || 0;

    if (totalDataPoints === 0) {
      console.log('Waiting for data...');
      return;
    }

    console.log('Data updated:', this.ctx.data);
    // Update your widget with new data
  }

  // Called by ThingsBoard when widget is resized
  public onResize(): void {
    console.log('Widget resized:', this.ctx.width, this.ctx.height);
    // Handle resize logic
  }
}
```

**`my-widget.component.html`:**

```html
<div #widgetContainer class="widget-container">
  <div class="widget-header">
    <h3>My Custom Widget</h3>
  </div>

  <div class="widget-content">
    <!-- Your widget UI goes here -->
    <p>Widget dimensions: {{ctx.width}}x{{ctx.height}}</p>
    <p>Number of data series: {{ctx.data?.length || 0}}</p>
  </div>
</div>
```

**`my-widget.component.scss`:**

```scss
:host {
  display: block;
  width: 100%;
  height: 100%;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", sans-serif;
}

.widget-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: white;
  border-radius: 8px;
  overflow: hidden;
}

.widget-header {
  padding: 16px;
  border-bottom: 1px solid #e5e5e7;
  background: linear-gradient(180deg, #ffffff 0%, #fafafa 100%);

  h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: #1d1d1f;
  }
}

.widget-content {
  flex: 1;
  padding: 16px;
  overflow: auto;
}
```

---

## Adding Widget Settings

Widget settings allow users to configure your widget in ThingsBoard.

### Step 1: Create Settings Interface

**`my-widget-settings.interface.ts`:**

```typescript
export interface MyWidgetSettings {
  // Visual Settings
  showHeader?: boolean;
  headerText?: string;
  backgroundColor?: string;

  // Data Settings
  refreshInterval?: number;
  maxDataPoints?: number;

  // Feature Toggles
  enableAnimations?: boolean;
  showLegend?: boolean;
}
```

### Step 2: Create Settings Component

**`settings/my-widget-settings.component.ts`:**

```typescript
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { WidgetSettings, WidgetSettingsComponent } from '@shared/public-api';
import { AppState } from '@core/core.state';
import { MyWidgetSettings } from '../my-widget-settings.interface';

@Component({
  selector: 'tb-my-widget-settings',
  templateUrl: './my-widget-settings.component.html',
  styleUrls: ['./my-widget-settings.component.scss']
})
export class MyWidgetSettingsComponent extends WidgetSettingsComponent {

  public myWidgetSettingsForm: FormGroup;

  constructor(
    protected store: Store<AppState>,
    private fb: FormBuilder
  ) {
    super(store);
  }

  protected defaultSettings(): MyWidgetSettings {
    return {
      showHeader: true,
      headerText: 'My Widget',
      backgroundColor: '#ffffff',
      refreshInterval: 5000,
      maxDataPoints: 100,
      enableAnimations: true,
      showLegend: true
    };
  }

  protected onSettingsSet(settings: MyWidgetSettings): void {
    this.myWidgetSettingsForm = this.fb.group({
      // Visual Settings
      showHeader: [settings.showHeader !== false, []],
      headerText: [settings.headerText || 'My Widget', [Validators.required]],
      backgroundColor: [settings.backgroundColor || '#ffffff', []],

      // Data Settings
      refreshInterval: [settings.refreshInterval || 5000, [Validators.min(1000)]],
      maxDataPoints: [settings.maxDataPoints || 100, [Validators.min(10)]],

      // Feature Toggles
      enableAnimations: [settings.enableAnimations !== false, []],
      showLegend: [settings.showLegend !== false, []]
    });
  }

  protected settingsForm(): FormGroup {
    return this.myWidgetSettingsForm;
  }

  protected validatorTriggers(): string[] {
    return ['showHeader', 'enableAnimations', 'showLegend'];
  }
}
```

**`settings/my-widget-settings.component.html`:**

```html
<form [formGroup]="myWidgetSettingsForm" *ngIf="myWidgetSettingsForm" class="apple-settings-form">
  <div class="settings-container">

    <!-- Visual Settings Section -->
    <div class="settings-section">
      <div class="section-header">
        <div class="section-info">
          <h3 class="section-title">Visual Settings</h3>
          <p class="section-subtitle">Configure the appearance of your widget</p>
        </div>
      </div>

      <div class="settings-content">
        <!-- Toggle Settings -->
        <div class="toggle-group">
          <div class="toggle-row">
            <label class="toggle-label">Show Header</label>
            <label class="apple-switch">
              <input type="checkbox" formControlName="showHeader">
              <span class="slider"></span>
            </label>
          </div>

          <div class="toggle-row">
            <label class="toggle-label">Enable Animations</label>
            <label class="apple-switch">
              <input type="checkbox" formControlName="enableAnimations">
              <span class="slider"></span>
            </label>
          </div>

          <div class="toggle-row">
            <label class="toggle-label">Show Legend</label>
            <label class="apple-switch">
              <input type="checkbox" formControlName="showLegend">
              <span class="slider"></span>
            </label>
          </div>
        </div>

        <!-- Input Settings -->
        <div class="input-group" *ngIf="myWidgetSettingsForm.get('showHeader')?.value">
          <label class="input-label">Header Text</label>
          <input type="text"
                 formControlName="headerText"
                 class="apple-input"
                 placeholder="Enter header text">
        </div>

        <div class="input-group">
          <label class="input-label">Background Color</label>
          <input type="color"
                 formControlName="backgroundColor"
                 class="apple-color-input">
        </div>
      </div>
    </div>

    <!-- Data Settings Section -->
    <div class="settings-section">
      <div class="section-header">
        <div class="section-info">
          <h3 class="section-title">Data Settings</h3>
          <p class="section-subtitle">Configure data handling</p>
        </div>
      </div>

      <div class="settings-content">
        <div class="input-group">
          <label class="input-label">Refresh Interval (ms)</label>
          <input type="number"
                 formControlName="refreshInterval"
                 class="apple-input"
                 min="1000"
                 step="1000">
        </div>

        <div class="input-group">
          <label class="input-label">Max Data Points</label>
          <input type="number"
                 formControlName="maxDataPoints"
                 class="apple-input"
                 min="10"
                 step="10">
        </div>
      </div>
    </div>

  </div>
</form>
```

**`settings/my-widget-settings.component.scss`:**

```scss
@import '../../../../../scss/lib-styles';

// Use the shared Apple-style settings styles
// See echarts-line-chart-settings.component.scss for full reference
```

---

## Adding Data Key Settings

Data key settings allow users to configure individual data series.

**`data-key-settings/my-widget-data-key-settings.component.ts`:**

```typescript
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { WidgetSettings, WidgetSettingsComponent } from '@shared/public-api';
import { AppState } from '@core/core.state';

export interface MyWidgetDataKeySettings {
  lineColor?: string;
  lineWidth?: number;
  showLine?: boolean;
  showPoints?: boolean;
  pointSize?: number;
}

@Component({
  selector: 'tb-my-widget-data-key-settings',
  templateUrl: './my-widget-data-key-settings.component.html',
  styleUrls: ['./my-widget-data-key-settings.component.scss']
})
export class MyWidgetDataKeySettingsComponent extends WidgetSettingsComponent {

  public dataKeySettingsForm: FormGroup;

  constructor(
    protected store: Store<AppState>,
    private fb: FormBuilder
  ) {
    super(store);
  }

  protected defaultSettings(): WidgetSettings {
    return {
      lineColor: '#007aff',
      lineWidth: 2,
      showLine: true,
      showPoints: true,
      pointSize: 5
    };
  }

  protected onSettingsSet(settings: MyWidgetDataKeySettings): void {
    this.dataKeySettingsForm = this.fb.group({
      lineColor: [settings.lineColor || '#007aff', []],
      lineWidth: [settings.lineWidth || 2, [Validators.min(1), Validators.max(10)]],
      showLine: [settings.showLine !== false, []],
      showPoints: [settings.showPoints !== false, []],
      pointSize: [settings.pointSize || 5, [Validators.min(1), Validators.max(15)]]
    });
  }

  protected settingsForm(): FormGroup {
    return this.dataKeySettingsForm;
  }
}
```

---

## Registering Your Widget

### Step 1: Export from public-api.ts

**`src/app/components/examples/public-api.ts`:**

```typescript
// Existing exports...
export * from './echarts-line-chart.component';

// Add your widget
export * from './my-widget/my-widget.component';
export * from './my-widget/settings/my-widget-settings.component';
export * from './my-widget/data-key-settings/my-widget-data-key-settings.component';
```

### Step 2: Register in Module

**`src/app/components/examples/examples.module.ts`:**

```typescript
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

// Existing imports...
import { EchartsLineChartComponent } from './echarts-line-chart.component';

// Add your imports
import { MyWidgetComponent } from './my-widget/my-widget.component';
import { MyWidgetSettingsComponent } from './my-widget/settings/my-widget-settings.component';
import { MyWidgetDataKeySettingsComponent } from './my-widget/data-key-settings/my-widget-data-key-settings.component';

@NgModule({
  declarations: [
    // Existing components...
    EchartsLineChartComponent,

    // Add your components
    MyWidgetComponent,
    MyWidgetSettingsComponent,
    MyWidgetDataKeySettingsComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule
    // Add other modules as needed
  ],
  exports: [
    // Export all widgets
    MyWidgetComponent
  ]
})
export class ExamplesModule {}
```

---

## Building and Testing

### Development Mode

```bash
# Install dependencies
npm install

# Start development server (port 5000)
npm start
```

Your widget will be available at:
```
http://localhost:5000/static/widgets/thingsboard-extension-widgets.js
```

### Production Build

```bash
# Build for production
npm run build
```

Built file location:
```
target/generated-resources/thingsboard-extension-widgets.js
```

### Linting

```bash
# Run ESLint
npm run lint
```

---

## Deploying to ThingsBoard

### Method 1: Development Mode (Local Testing)

1. In ThingsBoard, create a new widget
2. In the widget editor's **Resources** tab, add:
   ```
   http://localhost:5000/static/widgets/thingsboard-extension-widgets.js
   ```
3. Check **"Is module"**
4. Use your widget selector in the HTML tab:
   ```html
   <tb-my-widget [ctx]="ctx"></tb-my-widget>
   ```

### Method 2: Production Deployment

1. Build the project: `npm run build`
2. Upload `target/generated-resources/thingsboard-extension-widgets.js` to your server
3. In ThingsBoard widget resources, reference your hosted file:
   ```
   https://your-domain.com/path/to/thingsboard-extension-widgets.js
   ```

### Method 3: UI Upload

1. Build the project
2. Go to ThingsBoard → Widget Library → Upload
3. Upload `target/generated-resources/thingsboard-extension-widgets.js`
4. ThingsBoard will host it for you

---

## Best Practices

### 1. **TypeScript Interfaces**

Always define interfaces for your settings:

```typescript
export interface MyWidgetSettings {
  setting1?: string;  // Use optional for all settings
  setting2?: number;
}
```

### 2. **Widget Context (`ctx`)**

The `ctx` object provides access to:

- `ctx.settings` - Widget settings
- `ctx.data` - Time series data
- `ctx.datasources` - Data source information
- `ctx.width` / `ctx.height` - Widget dimensions
- `ctx.timeWindow` - Current time range
- `ctx.$scope` - ThingsBoard scope (for widget bridge)

### 3. **Lifecycle Methods**

Implement these methods for ThingsBoard integration:

```typescript
public onDataUpdated(): void {
  // Called when data is updated
}

public onResize(): void {
  // Called when widget is resized
}

ngOnDestroy(): void {
  // Clean up resources
}
```

### 4. **Component Bridge**

Always expose your component to ThingsBoard:

```typescript
ngAfterViewInit(): void {
  if (this.ctx.$scope) {
    this.ctx.$scope.myWidgetComponent = this;
    if (typeof this.ctx.$scope.componentReady === 'function') {
      this.ctx.$scope.componentReady();
    }
  }
}
```

### 5. **Error Handling**

Always handle missing or invalid data:

```typescript
public onDataUpdated(): void {
  if (!this.ctx.data || this.ctx.data.length === 0) {
    console.warn('No data available');
    return;
  }

  // Process data...
}
```

### 6. **Performance**

- Use `OnPush` change detection if possible
- Debounce resize events
- Limit DOM updates
- Use virtual scrolling for large lists

### 7. **Styling**

Use the Apple-style design system:

- Font: `-apple-system, BlinkMacSystemFont, "SF Pro Display"`
- Colors: ThingsBoard palette (`#007aff`, `#34c759`, etc.)
- Border radius: `8px` - `12px`
- Shadows: Subtle (`0 1px 3px rgba(0,0,0,0.05)`)

### 8. **Accessibility**

- Use semantic HTML
- Add ARIA labels
- Support keyboard navigation
- Ensure proper focus management

---

## Example: Complete Widget Checklist

- [ ] Create component folder in `src/app/components/examples/`
- [ ] Create TypeScript component (`.ts`)
- [ ] Create HTML template (`.html`)
- [ ] Create SCSS styles (`.scss`)
- [ ] Define settings interface
- [ ] Create settings component (optional)
- [ ] Create data key settings component (optional)
- [ ] Export from `public-api.ts`
- [ ] Register in `examples.module.ts`
- [ ] Implement `onDataUpdated()` method
- [ ] Implement `onResize()` method
- [ ] Expose component to `ctx.$scope`
- [ ] Test in development mode
- [ ] Build for production
- [ ] Deploy to ThingsBoard

---

## Resources

- **ThingsBoard UI Types**: [GitHub](https://github.com/thingsboard/thingsboard-ui-types)
- **ThingsBoard Docs**: [Widgets Development](https://thingsboard.io/docs/user-guide/contribution/widgets-development/)
- **Angular Documentation**: [angular.io](https://angular.io)
- **ECharts Documentation**: [echarts.apache.org](https://echarts.apache.org)

---

## Getting Help

If you encounter issues:

1. Check the existing `echarts-line-chart` widget for reference
2. Review `CLAUDE.md` for project-specific guidance
3. Check the console for errors
4. Review ThingsBoard widget logs
5. Verify your widget is properly registered in the module

---

**Happy Widget Building! 🚀**
