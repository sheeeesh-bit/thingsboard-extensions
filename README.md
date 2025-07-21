Extension ThingsBoard Platform
=====================
## ThingsBoard Dependencies
To add some of ThingsBoard dependencies imports to your "extension" Angular component,
please use this import structure:

```
import { <dependency> } from '<TB-module>/public-api';
```
"TB-module" - any of the following modules:
```
@app/*
@core/*
@shared/*
@modules/*
@home/*
```
"dependency" - name of dependency/type located in "TB-module".
Refer to [modules-map](https://github.com/thingsboard/thingsboard-pe-ui-types/blob/master/src/app/modules/common/modules-map.ts)
to see what you can use.

Example:

```
import { WidgetConfig } from '@shared/public-api';
```
## External Dependencies
In case you want to use your own dependencies package from the npm registry (unless you have specified another one in your package.json), you can easily add them to npm package manager running the next command:
```
npm install <package-name>
```

Example:

```
npm install lodash
```
If it's not the npm registry, and you want to add it in another way, please refer to [npm docs](https://docs.npmjs.com/cli/v10/commands/npm-install).

## Run project in development mode
```
cd ${TB_EXTENSION_WORK_DIR}
npm install
npm start
```
In widgets library create a new widget and in the resources tab of the widget editor add this file path:

```
http://localhost:5000/static/widgets/thingsboard-extension-widgets.js
```
You must also check "Is module"

## Build project

```
cd ${TB_EXTENSION_WORK_DIR}
npm run build
```

You can find the compiled file at the following path:
```
${TB_EXTENSION_WORK_DIR}/target/generated-resources/thingsboard-extension-widgets.js
```

## Deploy project to customer server

You have two options for deploying extensions:
1) Deploying using our UI. You can find all information about it in our [documentation](https://thingsboard.io/docs/user-guide/contribution/widgets-development/#thingsboard-extensions)
2) Manual deploying. In this case you should use this [branch](https://github.com/thingsboard/thingsboard-extensions/tree/release-3.6-server) of **Thingsboard extensions**
