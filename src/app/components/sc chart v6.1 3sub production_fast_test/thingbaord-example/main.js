// Get the browser's locale

const browserLocale = Intl.DateTimeFormat().resolvedOptions().timeZone.startsWith('Europe/') ? "en-GB" : navigator.language || navigator.userLanguage;



let DEBUG = true;
let debutTitle = "sc_chartV6.1";

// Create an Intl.DateTimeFormat object for the browser's locale
var $scope;
var myEchartContainer;
var myToggleButton;
var myChart;
var myStatsTable;
var myStatsContainer;
var option;
let translate;
let utils;

let relatedDevice;


var usedFormatter;


var rightAxisIsUsed = false;



var legendFontSize = 20;
var labelFontSize = 16;

var containerHeightLimit = [1000, 1200];     // defines after which hieght different config parameters are used
let currentConfig = ifSmallContainerConfig;


var zoomTimeWithSeconds = 60 * 60 * 1000;       // 1 day
var zoomTimeWithMinutes = 7 * 24 * 60 * 60 * 1000;  // 7 days 
var zoomTimeWithDays = 60 * 24 * 60 * 60 * 1000;   // 60 days

var currentGridInfo = [];

var maxGrids = 0;
var setGrids = [];
var currentGrids = 3;



var resetGrid = false;
var currentSize = "small";

var seriesNames = [];
var currentGridNames = [];



// Function to download the chart as an image
function downloadChartImage() {
    var img = new Image();
    img.src = myChart.getDataURL({
        type: 'png', // 'png' or 'jpeg'
        pixelRatio: 7, // Set higher for higher quality images
        backgroundColor: '#fff' // Optional: Set a background color if needed
    });

    // Create a download link
    var link = document.createElement('a');
    link.href = img.src;
    link.download = 'chart-image.png'; // File name
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link); // Clean up
}

// Programmatically reset zoom
function resetZoom() {

    myChart.dispatchAction({
        type: 'dataZoom',
        start: 0, // Reset to the full range
        end: 100
    });
    
    /*
    myChart.dispatchAction({
        type: 'restore'
    });
    */
    //self.onDataUpdated();
}



self.onInit = function() {
    utils = self.ctx.$scope.$injector.get(self.ctx.servicesMap.get('utils'));
    translate = self.ctx.translate;
    DEBUG = self.ctx.settings.debugOutput;
    currentConfig = isContainerHeight();
    
    //LOG("init ctx.datasources:", utils.deepClone(self.ctx.datasources));
    LOG("init ctx.data:", utils.deepClone(self.ctx.data));
    //LOG("Object.keys(axisPositionMap):", Object.keys(axisPositionMap));
    
    setGrids = countGridsBySettings(Object.keys(axisPositionMap));
    LOG("init setGrids:", setGrids);
    
    currentGridNames = [...setGrids];
    
    maxGrids = setGrids.size;
    currentGrids = maxGrids;
    LOG("maxGrids:", maxGrids);
    
    
    myChart = echarts.init($('#echartContainer', self.ctx.$container)[0]);
    
    LOG("currentConfig:", currentConfig);
    
    self.ctx.$scope.menuButtons = function (buttonName) {
        switch (buttonName) {
            case 'genImage':
                LOG("Picture Button clicked!!!!");
                downloadChartImage();
                break;
            case 'reset':
                //resetZoom();
                //myChart.dispose();
                //myChart = echarts.init($('#echartContainer', self.ctx.$container)[0]);
                resetChartCompletly();
                break;
            case 'delete':
                myChart.clear();
                self.onResize();
                break;
            
        }
    };
    

    
    setTimeFormatter();
    
    //checkAndLoadDevice(initChartAndGrid);
    initChartAndGrid();
};

function resetChartCompletly(keepGrids = false){
    myChart.clear();
    if(!keepGrids){
        currentGrids = maxGrids;
    }
    initChartAndGrid();
    self.onDataUpdated();
}

function checkAndLoadDevice(callbackAfterDone){
    let relationService = self.ctx.$scope.$injector.get(self.ctx.servicesMap.get('entityRelationService'));
    relationService.findByToAndType(self.ctx.data[0].datasource.entity.id, "Customer Entity View").subscribe(
        function(relation){
            LOG("relation:", relation);
            relatedDevice = relation[0].from;
            LOG("relatedDevice:", relatedDevice);
            callbackAfterDone();
        },
         function(error){
            LOG("checkAndLoadDevice error:", error);
            callbackAfterDone();
         });
    
}

function initChartAndGrid(){
    
    LOG("initChartAndGrid");
    
    setInitChartConfig();
    
    LOG("init chart listeners");
    myChart.on('legendselectchanged', function (event) {
        //LOG('Legend state changed!');
        //LOG('Legend event:', event);
        //LOG("Legend myChart:", myChart);
        
        const selected = event.selected;
        const selectedKeys = Object.keys(selected).filter(key => selected[key]);
        
        LOG("selected:", selected);
        LOG("selectedKeys:", selectedKeys);
        
        
        
         // Ensure at least one entry is selected
        if (selectedKeys.length === 0) {
            const lastSelected = event.name; // Re-enable the last deselected item
            const updatedSelected = { ...selected, [lastSelected]: true };
    
            // Update the legend selection
            myChart.setOption({
                legend: {
                    selected: updatedSelected
                }
            });
            return;
        }

        if (!checkDataGridByName(selectedKeys).has(AXIS_POSITION_NAMES['TOP'])) {
            const lastSelected = event.name; // Re-enable the last deselected item
            const updatedSelected = { ...selected, [lastSelected]: true };
    
            // Update the legend selection
            myChart.setOption({
                legend: {
                    selected: updatedSelected
                }
            });
            return;
        }
        
        const oldGridNr = currentGrids;
        setDataGridByNames(selectedKeys);
        
        if (oldGridNr != currentGrids){
            LOG("Different Grid number --> RESET CHART!!!!");
            resetGrid = true;
            
            //resetChartCompletly(keepGrids = true);
            //setInitChartConfig();
            //self.onDataUpdated();
            
            /*
            myChart.setOption({
                legend: {
                    selected: selected
                }
            });
            */
            //myChart.setOption({'yAxis' :});
            //myChart.setOption({'xAxis' :currentXAxisArray()});
            
            //LOG("myOptions:", utils.deepClone(myChart.getOption()));
            self.onResize();
            
        }
       
        
    });
}

function setInitChartConfig(){
    option = utils.deepClone(getInitConfig());
    //checkDataGridVisible();
    
    
    option.xAxis = currentXAxisArray();
    option.yAxis = currentYAxisArray();
    option.grid = currentGridArray();
    
    LOG("Init option set!")
    myChart.setOption(option);

}



self.onDataUpdated = function() {
    
    LOG("onDataUpdated ctx:", self.ctx);
    //LOG("onDataUpdated ctx.settings:", self.ctx.settings);
    //LOG("onDataUpdated ctx.decimals:", );
    
    currentConfig = isContainerHeight();
    
    
    
    const myNewOptions = {};
    //getInitConfig();
    myNewOptions.series = [];
    
    var series = Array();
    for (var i = 0; i < self.ctx.data.length; i++) {
        

        let seriesElement = {
            name: self.ctx.data[i].dataKey.label,
            itemStyle: {
                normal: {
                    color: self.ctx.data[i].dataKey.color,
                }
            },
            
            lineStyle: {
                width: (self.ctx.data[i].dataKey
            .settings.axisAssignment ==
                'Middle') ? currentConfig.seriesElement.lineStyle.widthMiddle : currentConfig.seriesElement.lineStyle.width
            },
            type: 'line',
            
            xAxisIndex: axisPositionMap[self.ctx.data[i].dataKey.settings.axisAssignment] > (currentGrids - 1) ? (currentGrids - 1) : axisPositionMap[self.ctx.data[i].dataKey.settings.axisAssignment],
            yAxisIndex: axisPositionMap[self.ctx.data[i].dataKey.settings.axisAssignment] > (currentGrids - 1) ? (currentGrids - 1) : axisPositionMap[self.ctx.data[i].dataKey.settings.axisAssignment],
            
            data: self.ctx.data[i].data,
            symbol: (self.ctx.settings
                    .showDataPoints) ? 'circle' : 'none',
                
            symbolSize: self.ctx.settings
                .symbolSize_data,
            smooth: self.ctx.settings.smooth
            /*
            markLine: {
                data: [
                    {
                        yAxis: 0 // Draw a line at y = 0 for the bottom plot as well
                    }
                ],
                lineStyle: {
                    type: 'dashed',
                    color: 'gray',
                    width: currentConfig.seriesElement.markline.lineStyle.width
                    
                },
                symbol: 'none',
                label: {
                    show : false
                }
            }
            */
        };
        myNewOptions.series.push(seriesElement);
     }
     
     
     
    
    setTimeFormatter();
    myNewOptions.xAxis = currentXAxisArray();
    myNewOptions.yAxis = currentYAxisArray();
    
    
    myNewOptions.grid = currentGridArray();
    
    
    LOG("myNewOptions:", myNewOptions);
    
    
    
    // Initialize the chart
    myChart.setOption(myNewOptions);
    
    if (resetGrid){
        // workaround ... dont know why it is not overwriting it above ...
        let myTemp = myChart.getOption();
        LOG("Reseting GRID:", myTemp);
        myTemp.xAxis[currentGrids - 1].show = true;
        myTemp.xAxis[currentGrids - 1].splitLine.show = true;
        
        const tempUnits = getGridUnitsByData();
        for(let i = 0; i < myTemp.yAxis.length; i++){
            myTemp.yAxis[i].axisLabel.formatter = ('{value} ' + tempUnits[i]) || '';
        }
        myChart.setOption(myTemp);
        resetGrid=false;
    } 
    // Hide toolbox icons with CSS
    //activateZoom();

};


self.onLatestDataUpdated = function() {

};

self.onResize = function() {
    LOG("ONRESIZE!!!");
    myChart.resize();
    currentConfig = isContainerHeight();
    self.onDataUpdated();

};

/*
dataZoom: [{
            type: 'inside',
            throttle: 50,
            start: 0,
            stop: 100
        }],
*/



function isContainerHeight(){
    if ((self.ctx.height >= containerHeightLimit[0]) && 
        (self.ctx.height < containerHeightLimit[1])){
        LOG("isContainerHeight:", "LARGE!!!");
        currentSize = SIZE_NAMES.LARGE;
        
        return ifLargeContainerConfig;
    } else if (self.ctx.height >= containerHeightLimit[1]){
        LOG("isContainerHeight:", "HUGE!!!");
        currentSize = SIZE_NAMES.HUGE;
        return ifHugeContainerConfig;
    }
    LOG("isContainerHeight:", "Small!!!");
    currentSize = SIZE_NAMES.SMALL;
    return ifSmallContainerConfig;
}


function currentGridArray(){
    switch(currentGrids){
        case 1:
            return gridConfig.singleGrid[currentSize].map(entry => ({ ...entry }));
        case 2:
            return gridConfig.doubleGrid[currentSize].map(entry => ({ ...entry }));
        case 3:
            return gridConfig.tripleGrid[currentSize].map(entry => ({ ...entry }));
     }
}


function currentXAxisArray(){
    let myXAxisArray =  [];
    
    
    myXAxisArray.push({
        type: 'time',
        gridIndex: 0, // Link to the first grid
        splitLine: {
            show: true,
            lineStyle: {
                width: currentConfig.option.yAxis.splitLine.lineStyle.width
            }
        },
        axisLine: { onZero: false },
        position: 'bottom', // Shared x-axis at the bottom
        axisLabel: {
            show: true,
            fontSize: currentConfig.option.xAxis.axisLabel.fontSize,
            fontWeight: currentConfig.option.xAxis.axisLabel.fontWeight,
            hideOverlap: true,
            // formatter: '{dd}-{MM}\n{yyyy}', // Format the date display
            formatter: function (value, index) {
                switch (usedFormatter.id){
                    case 'months':
                    case 'days':
                        return index === 0 ? firstLabelFormatterWithDays.format(value).replace(",", ",\n") : usedFormatter.formatter.format(value).replace(",", ",\n");
                    
                    case 'minutes':
                        return index === 0 ? firstLabelFormatterWithMinutes.format(value).replace(",", ",\n") : usedFormatter.formatter.format(value).replace(",", ",\n");
                    case 'seconds':
                        return index === 0 ? firstLabelFormatterWithSeconds.format(value).replace(",", ",\n") : usedFormatter.formatter.format(value).replace(",", ",\n");
                }
                
            },
            rotate: currentConfig.option.xAxis.rotate , // Optional: Rotate labels to avoid overlap
            align: 'right',
            margin: currentConfig.option.xAxis.margin,
            showMinLabel: true,
            showMaxLabel: true
        },
        min: self.ctx.timeWindow.minTime, 
        max: self.ctx.timeWindow.maxTime, 
    });
    if(maxGrids > 1){
        myXAxisArray.push({
            type: 'time',
            gridIndex: 1, // Link to the second grid,
            show: false
        });
    }
    if(maxGrids > 2){
        myXAxisArray.push({
            type: 'time',
            gridIndex: 2, // Link to the second grid,
            show: false
        });
    }
    
    if (currentGrids > 1){
        
        myXAxisArray[1] = {...myXAxisArray[0]};
        myXAxisArray[1].gridIndex = 1;
        
    }
    if (currentGrids > 2){
        myXAxisArray[2] = {
            type: 'time',
            show: true,
            gridIndex: 2, // Link to the second grid,
                       
            axisTick: { alignWithLabel: true },
            splitLine: {
                show: true,
                lineStyle: {
                    width: currentConfig.option.xAxis.splitLine.lineStyle.width
                }
            },
            axisLabel: { show: false }, // Hide x-axis labels for the first grid
            axisLine: { onZero: false },
            position: 'top', // Shared x-axis at the bottom
            min: self.ctx.timeWindow.minTime, 
            max: self.ctx.timeWindow.maxTime, 
        }; 
    }
    return myXAxisArray;
}

function currentYAxisArray(){
    let myYAxisArray =  [];
    
    //LOG("getGridUnitsByData:", getGridUnitsByData());
    const tempUnits = getGridUnitsByData();
    LOG("currentXAxisArray getGridUnitsByData:", tempUnits);
    
    myYAxisArray.push( {
        type: 'value',
        scale: true,
        splitNumber: currentConfig.option.yAxis.splitNumber, 
        name: self.ctx.settings
            .yAxisLeftTitle || '',
        axisLabel: {
            formatter: '{value} ' + (tempUnits[0] || ""),
            color: self.ctx.settings
            .legendcolortext,
            fontSize: currentConfig.option.yAxis.axisLabel.fontSize,
            fontWeight: currentConfig.option.yAxis.axisLabel.fontWeight,
            showMinLabel: true,
            showMaxLabel: true
        },
        splitLine: {
            show: true,
            lineStyle: {
                width: currentConfig.option.yAxis.splitLine.lineStyle.width
            }
        },
        gridIndex: 0, // Y-axis for the first grid
    });
    if(maxGrids > 1){
        myYAxisArray.push({
            type: 'value',
            gridIndex: 1, // Y-axis for the second grid
            show: false
        });
    }
    if(maxGrids > 2){
        myYAxisArray.push({
            type: 'value',
            gridIndex: 2, // Y-axis for the second grid
            show: false
        });
    }
    
    
    if (currentGrids > 1){
        myYAxisArray[1] = {
            type: 'value',
            scale: true,
            show: true,  
            splitNumber: currentConfig.option.yAxis.splitNumber, 
            
            alignTicks: true,
            name: self.ctx.settings
                .yAxisRightTitle || '',
            
            //interval: 5,
            axisLabel: {
                formatter: '{value} ' + (tempUnits[1] || ''
                ),
                fontSize: currentConfig.option.yAxis.axisLabel.fontSize,
                fontWeight: currentConfig.option.yAxis.axisLabel.fontWeight,
                show:true,
                showMaxLabel: true,
            },
            splitLine: {
                show: true,
                lineStyle: {
                    width: currentConfig.option.yAxis.splitLine.lineStyle.width
                }
            },
            gridIndex: 1 // Y-axis for the second grid
        };
        //LOG("currentYAxisArray > 1");
    }
    if (currentGrids > 2){
        myYAxisArray[2] = {
            type: 'value',
            show: true, 
            scale: true,
            splitNumber: currentConfig.option.yAxis.splitNumber, 
            
            alignTicks: true,
            name: self.ctx.settings
                .yAxisRightTitle || '',
            
            //interval: 5,
            axisLabel: {
                formatter: '{value} ' + (tempUnits[2] || ""
                ),
                fontSize: currentConfig.option.yAxis.axisLabel.fontSize,
                fontWeight: currentConfig.option.yAxis.axisLabel.fontWeight,
                show:true,
                showMaxLabel: true,
            },
            splitLine: {
                show: true,
                lineStyle: {
                    width: currentConfig.option.yAxis.splitLine.lineStyle.width
                }
            },
            gridIndex: 2 // Y-axis for the second grid
        };
        //LOG("currentYAxisArray > 2");
    }
    return myYAxisArray;

}


function checkDataGridVisible(){
    /*
    const name = self.ctx.data.map(entry => entry?.datakey?.label || null); 
    LOG("self.ctx.data[0].datakey?.label", self.ctx.data[0].datakey?.label);
    const axisAssignment = self.ctx.data.map(entry => entry?.datakey?.settings?.axisAssignment || null);
    const currentlyVisible =  axisAssignment.map(() => true);

    
    const inputArrays = [name, axisAssignment, currentlyVisible];
    LOG("inputArrays:", inputArrays);
    const result = transpose(inputArrays);
    LOG("checkDataGridVisible:", result);
    */
    
    currentGrids = Number(isGridShowingData(0)) +  Number(isGridShowingData(1)) + Number(isGridShowingData(2));
    LOG("currentGridsVisible:", currentGrids);
    
    LOG('Is Grid showing data:', isGridShowingData(0), "/", isGridShowingData(1), "/", isGridShowingData(2)); // Check for Grid 1
}

function setDataGridByNames(selectedKeys){
    //return uniqueMatches.size;
    currentGridNames = [...checkDataGridByName(selectedKeys)];
    currentGrids = currentGridNames.length;
    
    LOG("setDataGridByNames:", currentGrids, " -> ", currentGridNames);
}

function checkDataGridByName(selectedKeys){
    
           
    const matchedValues = selectedKeys.map(key => {
        //LOG("key:", key);
        //self.ctx.data.map(obj => LOG("obj", obj));
        //self.ctx.data.map(obj => LOG("obj.dataKey.label:", obj.dataKey.label));
        const foundObject = self.ctx.data.find(obj => obj.dataKey.label === key);
        //LOG("foundObject:", foundObject);
        return foundObject ? foundObject.dataKey.settings.axisAssignment : null;
    });
    LOG("matchedValues:", matchedValues);
    
    const uniqueMatches = new Set(matchedValues.filter(item => axisPositionMap.hasOwnProperty(item)));
    
    LOG("uniqueMatches:", uniqueMatches, ", len:", uniqueMatches.size);
    return uniqueMatches;
}

function countGridsBySettings(selectedKeys){
    const matchedValues = selectedKeys.map(key => {
        //LOG("key:", key);
        //self.ctx.data.map(obj => LOG("obj", obj));
        //self.ctx.data.map(obj => LOG("obj.dataKey.label:", obj.dataKey.label));
        const foundObject = self.ctx.data.find(obj => obj.dataKey.settings.axisAssignment === key);
        //LOG("foundObject:", foundObject);
        return foundObject ? foundObject.dataKey.settings.axisAssignment : null;
    });
    //LOG("matchedValues:", matchedValues);
    
    return new Set(matchedValues.filter(item => axisPositionMap.hasOwnProperty(item)));
}

function isGridShowingData(gridIndex) {
        const chartOption = myChart.getOption();
        const legendStatus = chartOption.legend[0].selected || {};
        
        //LOG("chartOption.legend:", chartOption.legend[0]);
        //LOG("chartOption.series:", chartOption.series)
        // Find series associated with the grid
        const seriesForGrid = chartOption.series.filter(series => series.xAxisIndex === gridIndex);
        //LOG("seriesForGrid:", seriesForGrid)
        // Check if any series for the grid is visible
        return seriesForGrid.some(series => legendStatus[series.name] !== false);
}

function getGridUnitsByData(){
    //LOG("currentGridNames: ", currentGridNames, ", currentGridNames.length:", currentGridNames.length);
    if (currentGridNames && (currentGridNames.length > 0)) {
        return currentGridNames.map(key => {
            //LOG("getDataUnitForGrid for", key, ":", getDataUnitForGrid(key));
            return getDataUnitForGrid(key)
        }) || [];
    }
    return ["","",""];
}

function getDataUnitForGrid(gridName){
    return self.ctx.data.find(item => 
        item.dataKey?.settings?.axisAssignment === gridName
    ).dataKey.units || "";
}


function LOG(...args){
    if(DEBUG){
        console.log(debutTitle, "|", ...args);        
    }
}

function LOGE(...args){
    if(DEBUG){
        console.error(debutTitle, "|", ...args);        
    }
}

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

const chartSizeMap = {
  small: 0,
  large: 1,
  huge: 2
};

const myConfigs = {
    small: ifSmallContainerConfig,
    large: ifLargeContainerConfig,
    huge: ifHugeContainerConfig
};

function transpose(array) {
    return array[0].map((_, colIndex) => array.map(row => row[colIndex]));
}

function getInitConfig() {
    return {
        legend: {
            type: "scroll",
            textStyle: {
                color: self.ctx.settings
                    .legendcolortext,
                fontWeight: currentConfig.option.legend.textStyle.fontWeight,
                fontSize: currentConfig.option.legend.textStyle.fontSize
            },
            itemWidth: currentConfig.option.legend.itemWidth,   // Width of the legend icon
            itemHeight: currentConfig.option.legend.itemHeight,  // Height of the legend icon
            itemGap: currentConfig.option.legend.itemGap, // Increase spacing between legend items
            //top: '10%', // Adjust the distance from the top
            tooltip: {
                show: true, // Enable legend tooltips globally
                backgroundColor: 'rgba(50, 50, 50, 0.8)', // Custom background color
                textStyle: {
                    color: '#fff' // Text color for better contrast
                },
                borderColor: '#fff', // Optional: border color
                borderWidth: 1, // Optional: border width
                formatter: function (params) {
                    return `Click "${params.name}" to hide or show data.`;
                }
            }
            
        },
        tooltip: {
                trigger: 'axis',
                axisPointer: {
                    type: 'cross',
                    snap: true,
                    link: [
                      {
                        xAxisIndex: 'all'
                      }
                    ]
                },
                formatter: function (params) {
                    
                    //LOG("tooltip params:", params);
                    let result = '';
                    
                    //let hoveredSeriesName = params[0].seriesName; // Get hovered series name
                    //let hoveredSeriesName = params.find(p => p.seriesIndex === myChart.__hoveredSeriesIndex)?.seriesName;
                    //LOG("myChart:", myChart);
                    let hoveredSeriesName = null;
                    
                    let legendOrder = self.ctx.data.map(item => item.dataKey.label)
                    //LOG("arraged Data:", legendOrder);
                    
                    // Convert params to a map for easy lookup
                    let paramsMap = {};
                    params.forEach(item => {
                        paramsMap[item.seriesName] = item;
                    });
                    
                    /*
                    for (let i = 0; i < params.length; i++) {
                        result += `${params[i].marker} ${params[i].seriesName}: ${params[i].value[1].toFixed(2)} ${self.ctx.data[i].dataKey?.units || ""}<br>`;
                    }
                    */
                    let gridName = self.ctx.data[0].dataKey.settings.axisAssignment;
                    
                    try {
                        for (let i = 0; i < legendOrder.length; i++) {
                            let seriesName = legendOrder[i];
                            
                            
                             if (i === 0){
                                if (paramsMap[seriesName]) {
                                    result += `${firstLabelFormatterWithSeconds.format(paramsMap[seriesName].value[0])}<br>`;
                                }
                                result += `<table style="border-collapse: collapse; width: 100%; font-size: 12px;">`;
                            }
                            
                            if(gridName != self.ctx.data[i].dataKey.settings.axisAssignment){
                                //result += `<br>`;
                                result += `<tr>
                                            <td style="text-align: left; padding: 2px;"> </td>
                                            <td style="text-align: right; padding: 2px;"> </td>
                                            <td style="text-align: right; padding: 2px;"> <br> </td>
                                          </tr>`;
                                gridName = self.ctx.data[i].dataKey.settings.axisAssignment;
                            }
                            
                
                            if (paramsMap[seriesName]) {
                                let item = paramsMap[seriesName];
                                let unit = self.ctx.data[i].dataKey?.units || ""; // Load unit dynamically
                                let value = Number(item.value[1]).toFixed(self.ctx.decimals);
                
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
                    
                    /*
                    LOG("tooltip test:", params.map(item => 
                        `${item.marker} ${item.seriesName}: ${item.value[1].toFixed(2)} units`
                    ).join('<br>'));
                    return "test";
                    */
                    
                    /*
                    return params.map(item => 
                        `${item.marker} ${item.seriesName}: ${item.value[1].toFixed(2)} units`
                    ).join('<br>');
                    */
                }
        },
        axisPointer: {
            link: [
              {
                xAxisIndex: 'all'
              }
            ]
        },
        dataZoom: [
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
        ]
    };
}

let xAxisConfig = {};

let yAxisConfig = {};

let gridConfig = {
   "singleGrid":{
      "small":[{
            "id": "main",
            "top":"8%",
            "left":"12%",
            "right":"1%",
            "height":"70%",
            "bottom":"2%"
         }
      ],
      "large":[{
            "id": "main",
            "top":"5%",
            "left":"12%",
            "right":"1%",
            "height":"75%",
            "bottom":"2%"
         }
      ],
      "huge":[{
            "id": "main",
            "top":"5%",
            "left":"10%",
            "right":"1%",
            "height":"75%",
            "bottom":"2%"
      }]
   },
   "doubleGrid":{
      "small":[
         {
            "id": "main",
            "top":"8%",
            "left":"12%",
            "right":"1%",
            "height":"30%"
         },
         {
            "id": "sub",
            "top":"50%",
            "left":"12%",
            "right":"1%",
            "bottom":"2%",
            "height":"30%"
         }
      ],
      "large":[
          {
            "id": "main",
            "top":"5%",
            "left":"10%",
            "right":"1%",
            "height":"35%"
         },
         {
            "id": "sub",
            "top":"50%",
            "left":"10%",
            "right":"1%",
            "bottom":"2%",
            "height":"35%"
         }
      ],
      "huge":[
         {
            "id": "main",
            "top":"5%",
            "left":"10%",
            "right":"1%",
            "height":"35%"
         },
         {
            "id": "sub",
            "top":"50%",
            "left":"10%",
            "right":"1%",
            "bottom":"2%",
            "height":"35%"
         }
      ]
   },
   "tripleGrid":{
       "small":[
         {
            "id": "main",
            "top":"5%",
            "left":"12%",
            "right":"1%",
            "height":"20%"
         },
         {
            "id": "sub",
            "top":"36%",
            "left":"12%",
            "right":"1%",
            "height":"20%"
         },
         {
            "id": "sub2",
            "top":"68%",
            "left":"12%",
            "right":"1%",
            "height":"20%"
         }
      ],
      "large":[
          {
            "id": "main",
            "top":"5%",
            "left":"10%",
            "right":"1%",
            "height":"20%"
         },
         {
            "id": "sub",
            "top":"36%",
            "left":"10%",
            "right":"1%",
            "height":"20%"
         },
         {
            "id": "sub2",
            "top":"68%",
            "left":"10%",
            "right":"1%",
            "bottom":"2%",
            "height":"20%"
         }
      ],
      "huge":[
         {
            "id": "main",
            "top":"5%",
            "left":"10%",
            "right":"1%",
            "height":"20%"
         },
         {
            "id": "sub",
            "top":"35%",
            "left":"10%",
            "right":"1%",
            "height":"20%"
         },
         {
            "id": "sub2",
            "top":"65%",
            "left":"10%",
            "right":"1%",
            "bottom":"10%",
            "height":"20%"
         }
      ]
      
   }
};


function setTimeFormatter(){
    
    try{
        var minTime,maxTime;
        var myData = self.ctx.data[0].data;
        //console.log("Data: ", myData);
        //console.log("Data[0]: ", myData[0][0]);
        //console.log("Data length: ", myData.length);
        minTime = myData[0][0];
        
        maxTime = myData[myData.length - 1][0];
        var totalTimeSpan = maxTime - minTime;

        
        //console.log("minTime", minTime);
        //console.log("maxTime", maxTime);
        //console.log("totalTimeSpan", totalTimeSpan);
        
        
        if (totalTimeSpan <= zoomTimeWithSeconds) {
            usedFormatter = zoomFormatterWithSeconds;
            //console.log("usedTime: < zoomFormatterWithSeconds");
        } else if (totalTimeSpan <= zoomTimeWithMinutes) {
            usedFormatter = zoomFormatterWithMinutes;
            //console.log("usedTime: < zoomFormatterWithMinutes");
        }else if (totalTimeSpan <= zoomTimeWithDays) {
            usedFormatter = zoomFormatterWithDays;
            //console.log("usedTime: < zoomTimeWithDays");
        } else {
            usedFormatter = zoomFormatterWithMonths;
            //console.log("usedTime: > zoomTimeWithMonths");
        }
    } catch(error) {
        //console.log("Time error:", error);
        usedFormatter = zoomTimeWithMinutes;
    }
    

}



const zoomFormatterWithMonths = {
    id: 'months',
    formatter: new Intl.DateTimeFormat(browserLocale, {
    year: '2-digit',
    month: '2-digit'
})};
const zoomFormatterWithDays = {
    id: 'days',
    formatter: new Intl.DateTimeFormat(browserLocale, {
    year: '2-digit',
    month: '2-digit',
    day: '2-digit'
})};

const zoomFormatterWithMinutes = {
    id: 'minutes',
    formatter: new Intl.DateTimeFormat(browserLocale, {
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
    day: '2-digit',
    
    
})};

const zoomFormatterWithSeconds = {
    id: 'seconds',
    formatter: new Intl.DateTimeFormat(browserLocale, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
})};

firstLabelFormatterWithDays = new Intl.DateTimeFormat(browserLocale, {
    day: '2-digit',
    month: 'short',
    year: '2-digit',
});

firstLabelFormatterWithMinutes = new Intl.DateTimeFormat(browserLocale, {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: 'short',
    year: '2-digit',
});

firstLabelFormatterWithSeconds = new Intl.DateTimeFormat(browserLocale, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    day: '2-digit',
    month: 'short',
    year: '2-digit',
});


var ifSmallContainerConfig = {
    "seriesElement": {
        "lineStyle": {
            "width": 4,
            "widthMiddle": 3
        },
        "markline": {
            "lineStyle": {
                "width":2
            }
        }
    },
    "option" : {
        "legend":{
            "textStyle":{
                "fontWeight": "bold",
                "fontSize": 14
            },
            "itemWidth":40,
            "itemHeight":12,
            "itemGap": 20,
        },
        "xAxis":{
            "splitLine": {
                "lineStyle":{
                    "width": 2
                }
            },
            "axisLabel": {
                "fontSize": 14,
                "fontWeight": "normal" //550
            },
            "rotate": 40,
            "margin":15
        },
        "yAxis":{
            "splitNumber": 3,
            "splitLine": {
                "lineStyle":{
                    "width": 2
                }
            },
            "axisLabel": {
                "fontSize": 14,
                "fontWeight": "normal" //550
            }
        }
    }
};

var ifLargeContainerConfig = {
    "seriesElement": {
        "lineStyle": {
            "width": 5,
            "widthMiddle": 4
        },
        "markline": {
            "lineStyle": {
                "width":3
            }
        }
    },
    "option" : {
        "legend":{
            "textStyle":{
                "fontWeight": "bold",
                "fontSize": 20
            },
            "itemWidth":60,
            "itemHeight":15,
            "itemGap": 20,
        },
        "xAxis":{
            "splitLine": {
                "lineStyle":{
                    "width": 3
                }
            },
            "axisLabel": {
                "fontSize": 16,
                "fontWeight": 550
            },
            "rotate": 40,
            "margin":20
        },
        "yAxis":{
            "splitNumber": 3,
            "splitLine": {
                "lineStyle":{
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

var ifHugeContainerConfig = {
    "seriesElement": {
        "lineStyle": {
            "width": 5,
            "widthMiddle": 4
        },
        "markline": {
            "lineStyle": {
                "width":3
            }
        }
    },
    "option" : {
        "legend":{
            "textStyle":{
                "fontWeight": "bold",
                "fontSize": 24
            },
            "itemWidth":70,
            "itemHeight":20,
            "itemGap": 30,
        },
        "xAxis":{
            "splitLine": {
                "lineStyle":{
                    "width": 3
                }
            },
            "axisLabel": {
                "fontSize": 18,
                "fontWeight": 550
            },
            "rotate": 40,
            "margin":20
        },
        "yAxis":{
            "splitNumber": 4,
            "splitLine": {
                "lineStyle":{
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
