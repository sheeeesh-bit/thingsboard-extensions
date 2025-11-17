# Screenshot Widget Refactor Plan

## Architecture Overview

### Before (Monolithic - 1693 lines)
- ❌ All logic in one component file
- ❌ Magic numbers scattered throughout
- ❌ Mixed concerns (UI, business logic, utilities)
- ❌ Hard to test
- ❌ Hard to maintain

### After (Modular Architecture)

```
screenshot-widget/
├── models/
│   └── screenshot.models.ts          # Type definitions
├── services/
│   └── screen-capture.service.ts     # Screen Capture API logic
├── utils/
│   ├── browser-detector.ts           # Browser detection
│   ├── dimension-calculator.ts       # All dimension math
│   ├── canvas-processor.ts           # Canvas operations
│   ├── sticky-detector.ts            # Header detection
│   └── ui-helper.ts                  # Dialog & input blocking
├── constants/
│   └── screenshot.constants.ts       # Configuration values
└── screenshot-widget.component.ts    # Orchestration only
```

## Benefits

### 1. Single Responsibility Principle
- Each class/file has ONE job
- Easy to understand and modify
- Testable in isolation

### 2. Separation of Concerns
- **Models**: Data structures
- **Services**: Business logic
- **Utils**: Pure functions (no side effects)
- **Constants**: Configuration
- **Component**: UI orchestration only

### 3. Type Safety
- Proper TypeScript interfaces
- No `any` types
- Self-documenting code

### 4. Maintainability
- Find code easily (logical organization)
- Change constants without touching logic
- Reusable utilities

### 5. Testability
- Pure functions are easy to test
- Mock services easily
- Test utilities independently

## Migration Strategy

### Phase 1: Create Foundation ✅
- [x] Create models/screenshot.models.ts
- [x] Create services/screen-capture.service.ts
- [x] Create utils/browser-detector.ts
- [x] Create utils/dimension-calculator.ts
- [x] Create utils/canvas-processor.ts
- [x] Create utils/sticky-detector.ts
- [x] Create utils/ui-helper.ts
- [x] Create constants/screenshot.constants.ts

### Phase 2: Refactor Component
- [ ] Update imports to use new utilities
- [ ] Replace inline logic with service calls
- [ ] Use constants instead of magic numbers
- [ ] Simplify component to orchestration only
- [ ] Remove duplicated code

### Phase 3: Testing & Validation
- [ ] Test all browsers
- [ ] Verify gap detection
- [ ] Confirm browser chrome handling
- [ ] Test Firefox window mode

### Phase 4: Documentation
- [ ] Add JSDoc comments
- [ ] Document architecture decisions
- [ ] Create usage examples

## Code Quality Improvements

### Before:
```typescript
const notificationHeightEstimate = Math.ceil(50 * dpr); // Magic number!
const dpr = videoWidth / windowWidth; // Inline calculation
```

### After:
```typescript
const notificationHeight = DimensionCalculator.detectNotificationHeight(
  windowHeightBefore,
  windowHeightAfter,
  metrics.dpr
);
```

### Before:
```typescript
// 100+ lines of canvas stitching in component
```

### After:
```typescript
const finalCanvas = CanvasProcessor.stitchPieces(captures);
```

## Professional Patterns Applied

1. **Dependency Injection Ready** - Services can be injected
2. **SOLID Principles** - Single responsibility, Open/closed
3. **DRY** - Don't repeat yourself
4. **KISS** - Keep it simple
5. **Clean Code** - Self-documenting
6. **Separation of Concerns** - Clear boundaries
7. **Type Safety** - Catch errors at compile time

## Next Steps

Ready to migrate the main component to use these utilities?
This will reduce the component from ~1400 lines to ~400 lines!
