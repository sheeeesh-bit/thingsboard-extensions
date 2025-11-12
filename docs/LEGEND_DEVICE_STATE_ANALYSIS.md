# Legend and Device State Analysis

## Current State Management Architecture

### 1. State Storage Components

#### **plotLabelStates** (Map<string, boolean>)
- Tracks visibility state of each plot/label (e.g., "Temperature", "Humidity")
- Independent of device/entity visibility
- Persists across device show/hide operations
- Key: label name, Value: visibility state

#### **entityList** (Array)
- Tracks all unique devices/entities in the widget
- Properties per entity:
  - `name`: Entity identifier
  - `visible`: Whether entity's data should be shown
  - `color`: Display color
  - `count`: Number of series
  - `dataPoints`: Total data points

#### **legendItems** (Array)
- Represents the custom legend UI elements
- Properties per item:
  - `label`: Plot label
  - `selected`: Current visibility state
  - `plotNumber`: Display number

### 2. State Flow and Interactions

```
┌──────────────────┐
│  Plot Labels     │ ←─── plotLabelStates Map
│  (Temperature)   │      (label → boolean)
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Series Keys     │ ←─── buildSeriesKey(entity, label)
│  (Device1_Temp)  │      Combines entity + label
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  ECharts Legend  │ ←─── Hidden controller legend
│  (Controller)    │      Manages actual visibility
└──────────────────┘
```

### 3. Key Functions and Their Roles

#### **toggleLabel(item)**
- Toggles a plot/label visibility
- Updates `plotLabelStates` Map
- Affects ALL devices that have this label
- Prevents hiding last visible series

#### **toggleEntityVisibility(entityName)**
- Toggles a specific device/entity
- Respects `plotLabelStates` - won't show hidden plots
- Updates `entityList` visibility

#### **showAllDevices()**
- Shows all devices/entities
- **Respects plot states** - hidden plots stay hidden
- Initializes plot states if not set

#### **hideAllDevices()**
- Hides all devices/entities
- Preserves plot states for when devices are shown again
- Updates grid configuration if needed

#### **getLegendState()**
- Builds legend data from current context
- Defaults new series to OFF (hidden)
- Preserves existing selection states

### 4. State Synchronization Issues

#### Issue 1: Plot State Independence
- Plot states (`plotLabelStates`) are independent of device states
- When toggling devices, plot states are respected
- This creates complex interaction patterns

#### Issue 2: Series Key Management
- Series keys combine entity + label: `buildSeriesKey(entity, label)`
- Multiple entities can have same label
- Legend actions affect all series with matching keys

#### Issue 3: Default State Initialization
- New series default to hidden (`selected[key] = false`)
- Plot states initialize to visible when first encountered
- Can create inconsistency between plot and series states

### 5. State Update Flow

1. **User Action** → Toggle device/plot
2. **Immediate UI Update** → Optimistic rendering
3. **Batched Dispatch** → ECharts legend actions
4. **Post-Processing** →
   - Refresh entity list
   - Sync custom legend
   - Update grid configuration
5. **Change Detection** → Angular update cycle

### 6. Critical State Rules

1. **Plot State Priority**: Plot visibility always overrides device visibility
2. **Last Series Protection**: Cannot hide the last visible series
3. **State Persistence**: Plot states persist across device operations
4. **Default Hidden**: New series default to hidden state
5. **Batch Operations**: Multiple legend actions are batched for performance

### 7. Potential Improvements

1. **Unified State Model**: Combine plot and device states into single source
2. **State Persistence**: Save/restore states across widget reloads
3. **Clearer Hierarchy**: Make plot/device relationship more explicit
4. **State Validation**: Add checks for state consistency
5. **State Events**: Emit events for state changes for better tracking