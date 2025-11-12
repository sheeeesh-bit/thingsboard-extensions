# Widget Quick Start Guide

Quick reference for creating new widgets in this project.

## 🚀 Create New Widget (Automated)

```bash
# Using the helper script
./create-widget.sh my-widget-name "My Widget Display Name"

# Example
./create-widget.sh temperature-gauge "Temperature Gauge"
```

The script will:
1. ✅ Copy template files
2. ✅ Rename all files
3. ✅ Replace placeholders
4. ✅ Show registration instructions
5. ✅ Open files in VS Code

## 📝 Manual Registration

After running the script, register your widget:

### 1. `examples.module.ts`

```typescript
// Add imports
import { MyWidgetComponent } from './my-widget/my-widget.component';
import { MyWidgetSettingsComponent } from './my-widget/settings/my-widget-settings.component';
import { MyWidgetDataKeySettingsComponent } from './my-widget/data-key-settings/my-widget-data-key-settings.component';

@NgModule({
  declarations: [
    // ... existing
    MyWidgetComponent,
    MyWidgetSettingsComponent,
    MyWidgetDataKeySettingsComponent
  ],
  exports: [
    MyWidgetComponent
  ]
})
```

### 2. `public-api.ts`

```typescript
export * from './my-widget/my-widget.component';
export * from './my-widget/settings/my-widget-settings.component';
export * from './my-widget/data-key-settings/my-widget-data-key-settings.component';
```

## 🔧 Implementation Checklist

- [ ] Run `./create-widget.sh widget-name`
- [ ] Register in `examples.module.ts`
- [ ] Export from `public-api.ts`
- [ ] Implement widget logic:
  - [ ] `initWidget()` - Initialize
  - [ ] `updateWidget()` - Update with data
  - [ ] `handleResize()` - Handle resize
- [ ] Configure settings (optional)
- [ ] Test with `npm start`
- [ ] Build with `npm run build`

## 📁 Widget File Structure

**ALL widgets use consistent folder structure:**

```
src/app/components/examples/
├── echarts-line-chart/             # ← Existing widget
│   ├── echarts-line-chart.component.ts
│   ├── echarts-line-chart.component.html
│   ├── echarts-line-chart.component.scss
│   ├── settings/
│   │   ├── echarts-line-chart-settings.component.ts
│   │   ├── echarts-line-chart-settings.component.html
│   │   └── echarts-line-chart-settings.component.scss
│   └── data-key-settings/
│       ├── echarts-line-chart-data-key-settings.component.ts
│       ├── echarts-line-chart-data-key-settings.component.html
│       └── echarts-line-chart-data-key-settings.component.scss
└── my-widget/                      # ← Your new widget
    ├── my-widget.component.ts
    ├── my-widget.component.html
    ├── my-widget.component.scss
    ├── my-widget.interface.ts
    ├── settings/
    │   └── my-widget-settings.component.ts
    └── data-key-settings/
        └── my-widget-data-key-settings.component.ts
```

> **Note:** All widgets are self-contained in their own folders. This makes the project organized and scalable!

## 🎨 Key Concepts

### Widget Context (`ctx`)

```typescript
this.ctx.settings      // Widget settings
this.ctx.data          // Time series data
this.ctx.datasources   // Data sources
this.ctx.width         // Widget width
this.ctx.height        // Widget height
this.ctx.timeWindow    // Time range
this.ctx.$scope        // ThingsBoard scope
```

### Lifecycle Methods

```typescript
ngOnInit() {
  // Access settings, initialize state
}

ngAfterViewInit() {
  // Initialize widget, expose to ThingsBoard
  if (this.ctx.$scope) {
    this.ctx.$scope.myWidgetComponent = this;
    this.ctx.$scope.componentReady?.();
  }
}

onDataUpdated() {
  // Called by ThingsBoard when data updates
}

onResize() {
  // Called by ThingsBoard when widget resizes
}

ngOnDestroy() {
  // Clean up resources
}
```

## 🧪 Testing

### Development Mode

```bash
npm start
# Widget available at:
# http://localhost:5000/static/widgets/thingsboard-extension-widgets.js
```

### ThingsBoard Setup

1. Create new widget in ThingsBoard
2. Add resource URL (dev server URL above)
3. Check "Is module"
4. Use widget selector in HTML:
   ```html
   <tb-my-widget [ctx]="ctx"></tb-my-widget>
   ```

### Production Build

```bash
npm run build
# Output:
# target/generated-resources/thingsboard-extension-widgets.js
```

## 📚 Documentation

- **Full Guide**: `/ADDING_NEW_WIDGETS.md`
- **Template README**: `/src/app/components/examples/_widget-template/README.md`
- **Reference Widget**: `echarts-line-chart` component
- **ThingsBoard Docs**: https://thingsboard.io/docs/

## 🆘 Common Issues

### Widget Not Showing

- ✅ Check widget is registered in module
- ✅ Check widget is exported from public-api
- ✅ Check selector matches HTML
- ✅ Check console for errors

### Settings Not Saving

- ✅ Check form control names match
- ✅ Check `settingsForm()` returns correct form
- ✅ Check `defaultSettings()` includes all fields

### Data Not Updating

- ✅ Implement `onDataUpdated()` method
- ✅ Check `ctx.$scope` bridge is set
- ✅ Check data points > 0 before processing

## 💡 Tips

1. **Use the template** - It includes all best practices
2. **Reference existing widgets** - Copy patterns that work
3. **Enable debug mode** - Set `debugOutput: true` in settings
4. **Test incrementally** - Build, test, repeat
5. **Follow Apple design** - Use included styles

---

**Need help?** Check the full guide at `/ADDING_NEW_WIDGETS.md`
