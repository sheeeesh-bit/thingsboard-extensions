# CLAUDE.md - ThingsBoard Widget Development Guide

## 🎯 Development Workflow

### 1. Planning Phase
- **Always start by** reading relevant files and understanding the current state
- **Create a plan** in `todo/todo.md` with clear, manageable tasks
- **Get approval** before implementing major changes
- **Keep it simple** - every change should be minimal and focused

### 2. Implementation Phase
- **Work incrementally** - complete one task at a time
- **Commit frequently** - use meaningful commit messages for easy rollback
- **Test as you go** - don't wait until the end
- **Document changes** - update todo.md as you progress

### 3. Review Phase
- **Summarize changes** in the review section of todo.md
- **Note any issues** or technical debt created
- **Suggest next steps** for future development

## 📋 Project Overview

This is a ThingsBoard Extension Widgets project that provides a framework for developing custom widgets that integrate with the ThingsBoard IoT platform. The project uses Angular 18 with a custom build system to create widgets that can be loaded dynamically into ThingsBoard dashboards.

## 🔗 Quick Access URLs

| Purpose | URL | Credentials |
|---------|-----|-------------|
| Widget Editor | `http://localhost:8080/resources/widgets-library/widget-types/0b1f1400-63b2-11f0-ada4-17812a0522d3` | `tenant@thingsboard.org` / `tenant` |
| Test Dashboard | `http://localhost:8080/dashboards/865bc570-6630-11f0-90af-17812a0522d3` | Same as above |
| Dev Server | `http://localhost:5000/static/widgets/thingsboard-extension-widgets.js` | N/A |

## 🛠️ Essential Commands

```bash
# Development
npm install              # Install dependencies
npm start               # Start dev server (port 5000)
npm run lint            # Check code quality

# Building
npm run build           # Production build
npm run build:scss      # Build styles only

# Git Workflow (Recommended)
git add -A && git status                    # Review changes
git commit -m "feat: Your change here"      # Commit with conventional format
git log --oneline -5                        # View recent commits
```

## 🏗️ Architecture

### Build Pipeline
```
style.scss → PostCSS → style.comp.scss → Angular Build → SystemJS Bundle → target/
```

### Key Directories
```
src/
├── app/
│   ├── components/
│   │   └── examples/           # Widget implementations
│   ├── thingsboard-extension-widgets.module.ts
│   └── public-api.ts          # Public exports
├── scss/                      # Global styles
└── assets/                    # Static resources

todo/                          # Task tracking
└── YYYY-MM-DD_HH-MM/         # Context snapshots
```

### Import Paths
```typescript
// Use these ThingsBoard module prefixes:
import { WidgetContext } from '@home/models/widget-component.models';
import { WidgetConfig } from '@shared/public-api';
import { DashboardService } from '@core/public-api';
// Available: @app, @core, @shared, @modules, @home
```

## 📝 Widget Development Checklist

- [ ] Create component files (.ts, .html, .scss)
- [ ] Add settings component (if needed)
- [ ] Export in `examples.module.ts`
- [ ] Import required Angular modules
- [ ] Test in dashboard
- [ ] Document features in README
- [ ] Create git commit

## 🧪 Testing Best Practices

### Dashboard Testing
1. Navigate to test dashboard
2. Enter edit mode
3. Hover over widget and click edit
4. Test all settings combinations
5. Verify responsive behavior

### Playwright Testing
- Use HTML content over screenshots
- Test actual functionality, not just UI
- Always test in dashboard context

## 🚨 Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Widget not updating | Check `ctx.detectChanges()` calls |
| Settings not saving | Verify form control names match |
| Compilation errors | Check module imports |
| Widget not loading | Ensure exported in module |

## 🔧 Advanced Tips

### Performance
- Use `OnPush` change detection when possible
- Debounce data updates
- Dispose resources in `ngOnDestroy`

### Debugging
- Enable debug mode in widget settings
- Check browser console for errors
- Use source maps for debugging

### Settings Design
- Group related settings
- Use conditional visibility
- Provide helpful descriptions
- Set sensible defaults

## 📚 Current Widget Features

### ECharts Multi-Plot Line Chart
- **Multi-plot support**: Up to 7 independent plots
- **Toolbar controls**: Export, zoom reset, stats, min/max, alarms
- **Statistics panel**: Real-time metrics display
- **Alarm visualization**: Threshold lines and violation areas
- **Customizable**: Extensive settings for all features

## 🎯 Todo Management

### Creating Tasks
```bash
# Create timestamped context
mkdir -p todo/$(date +%Y-%m-%d_%H-%M)

# Update todo.md with:
- Clear task descriptions
- Priority levels (high/medium/low)
- Status tracking (pending/in-progress/completed)
```

### Task Guidelines
- Break large features into small tasks
- One task = one commit
- Test after each task
- Update todo.md status immediately

## 💡 Best Practices Summary

1. **Plan before coding** - Think through the entire change
2. **Keep changes small** - Easier to review and rollback
3. **Test incrementally** - Don't wait until the end
4. **Commit frequently** - Create restore points
5. **Document as you go** - Future you will thank you
6. **Ask when unsure** - Better to clarify than assume

---

*Last Updated: 2025-07-21*
*Version: 2.0*