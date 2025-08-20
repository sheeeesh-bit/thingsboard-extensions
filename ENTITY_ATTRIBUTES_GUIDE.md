# ThingsBoard Entity Attributes Access Guide

This guide shows all the different ways to access entity attributes (particularly `deviceName` from SERVER_SCOPE) in a ThingsBoard widget.

## Understanding Attribute Scopes in ThingsBoard

ThingsBoard has different attribute scopes:
- **SERVER_SCOPE**: Server-side attributes (not visible to devices)
- **CLIENT_SCOPE**: Attributes visible to devices
- **SHARED_SCOPE**: Attributes shared between server and devices

## Methods to Access Entity Attributes

### 1. From Widget Data Context (Immediate Access)

```typescript
// Check if attributes are already loaded in the datasource
const entityData = this.ctx?.data?.find(d => d.datasource?.entityName === entityName);

// Method 1.1: Check resolved attributes
if (entityData.datasource?.resolvedAttributes?.deviceName) {
  return entityData.datasource.resolvedAttributes.deviceName;
}

// Method 1.2: Check datasource attributes directly
if (entityData.datasource?.attributes?.deviceName) {
  return entityData.datasource.attributes.deviceName;
}

// Method 1.3: Check server attributes
if (entityData.datasource?.serverAttributes?.deviceName) {
  return entityData.datasource.serverAttributes.deviceName;
}

// Method 1.4: Check entity label (often used as display name)
if (entity.label) {
  return entity.label;
}

// Method 1.5: Check additionalInfo object
if (entity.additionalInfo?.deviceName) {
  return entity.additionalInfo.deviceName;
}
```

### 2. From Widget Scope (If Pre-loaded)

```typescript
// Check if attributes are in the widget scope
if (this.ctx.$scope?.deviceAttributes) {
  const deviceAttrs = this.ctx.$scope.deviceAttributes[entityId];
  if (deviceAttrs?.deviceName) {
    return deviceAttrs.deviceName;
  }
}
```

### 3. From Datasources Array

```typescript
// Check the datasources array
if (this.ctx.datasources) {
  for (const ds of this.ctx.datasources) {
    if (ds.entityName === entityName) {
      // Check various locations
      if (ds.attributes?.deviceName?.value) {
        return ds.attributes.deviceName.value;
      }
      if (ds.latestValues?.deviceName) {
        return ds.latestValues.deviceName;
      }
    }
  }
}
```

### 4. Fetch Attributes via API (Asynchronous)

```typescript
// Using ThingsBoard's attribute service
async fetchEntityAttributes(entityId: string, entityType: string) {
  if (this.ctx.attributeService) {
    const attributes = await this.ctx.attributeService.getEntityAttributes(
      entityType,
      entityId,
      'SERVER_SCOPE',
      ['deviceName', 'label', 'description']
    ).toPromise();
    
    const deviceNameAttr = attributes.find(attr => attr.key === 'deviceName');
    if (deviceNameAttr?.value) {
      return deviceNameAttr.value;
    }
  }
}
```

### 5. Using HTTP Service Directly

```typescript
// Direct HTTP call to ThingsBoard API
async fetchViaHttp(entityId: string, entityType: string) {
  if (this.ctx.http) {
    const url = `/api/plugins/telemetry/${entityType}/${entityId}/values/attributes/SERVER_SCOPE`;
    const attributes = await this.ctx.http.get(url).toPromise();
    
    if (attributes.deviceName) {
      return attributes.deviceName.value;
    }
  }
}
```

## Widget Settings Configuration

To ensure attributes are available, configure your widget settings:

```json
{
  "datasources": [{
    "type": "entity",
    "entityAliasId": "...",
    "dataKeys": [{
      "name": "temperature",
      "type": "timeseries"
    }],
    "latestDataKeys": [{
      "name": "deviceName",
      "type": "attribute",
      "attributeScope": "SERVER_SCOPE"
    }]
  }]
}
```

## Debug Logging

The enhanced `getEntityDisplayName` method includes extensive logging to help debug:

```typescript
// Enable debug output in widget settings
this.ctx.settings.debugOutput = true;

// Logs will show:
// - Entity processing details
// - Which methods are being tried
// - What data structures are available
// - Where attributes are found (or not found)
```

## Common Issues and Solutions

### Issue 1: Attributes Not Available
**Problem**: `deviceName` returns undefined  
**Solution**: Attributes might not be included in the data subscription. Add them to the widget's datasource configuration.

### Issue 2: Wrong Scope
**Problem**: Can't find SERVER_SCOPE attributes  
**Solution**: Ensure you're looking in the right scope. CLIENT_SCOPE and SERVER_SCOPE are separate.

### Issue 3: Timing Issues
**Problem**: Attributes not available immediately  
**Solution**: Use async fetching or wait for data to be fully loaded:

```typescript
ngAfterViewInit() {
  // Wait for data to be fully loaded
  setTimeout(() => {
    this.refreshEntityList();
  }, 1000);
}
```

### Issue 4: Entity Names vs IDs
**Problem**: Entity shows as UUID like "a2946778"  
**Solution**: This is the entity name (which might be a UUID). You need to fetch the `deviceName` attribute separately.

## Testing in Browser Console

You can test attribute access in the browser console:

```javascript
// Get widget context
const ctx = $scope.ctx;

// Check datasources
console.log('Datasources:', ctx.datasources);

// Check first entity's attributes
if (ctx.data && ctx.data[0]) {
  console.log('First entity datasource:', ctx.data[0].datasource);
  console.log('Entity:', ctx.data[0].datasource.entity);
  console.log('Attributes:', ctx.data[0].datasource.attributes);
}

// Check if attribute service is available
console.log('Attribute Service:', ctx.attributeService);
```

## Complete Implementation Example

See the `getEntityDisplayName` method in `echarts-line-chart.component.ts` for a complete implementation that:
1. Checks multiple data locations
2. Uses caching to avoid repeated lookups
3. Falls back gracefully when attributes aren't available
4. Logs extensively for debugging
5. Attempts async fetching for future use