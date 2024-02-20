// @ts-ignore
import * as d3 from "d3";

// @ts-ignore
import f from "./d3-jetpack-modules/d3-jetpack-f";
import {
  Size,
  Tooltip,
  DataViewRow,
  ContextMenu,
  GeneralStylingInfo,
  ScaleStylingInfo,
} from "spotfire-api";

import {
  setTrellisPanelZoomedTitle,
  adjustColor,
  LOG_CATEGORIES,
  Log,
  GenerateRoundedRectSvg,
} from "./index";

// @ts-ignore
import { sliderLeft } from "d3-simple-slider";
// @ts-ignore
import { ShapeInfo, Intersection } from "kld-intersections";
import { renderStatisticsTable } from "./render-stats-table";
import { SumStatsConfig } from "./sumstatsconfig";
import {
  RenderState,
  Data,
  Options,
  D3_SELECTION,
  RenderedPanel,
  SumStatsSettings,
  StatisticsConfig,
  TrellisZoomConfig,
} from "./definitions";
import { renderBoxplot } from "./render-box-plot";
import { renderViolin } from "./render-violin-plot";
import { renderComparisonCircles } from "./render-comparison-circles";

/*
 * Adapted from:
 * https://stackoverflow.com/questions/34893707/is-there-a-polyfill-for-getintersectionlist-getenclosurelist-checkintersection
 * For Firefox support for checkIntersection methods used for box plot (points) marking
 */
const checkIntersectionPolyfill = function (element: any, rect: any) {
  // @ts-ignore
  var root = this.ownerSVGElement || this;

  // Get the bounding boxes of the two elements
  var bbox1 = element.getBBox();
  var bbox2 = rect;

  // Check if the two bounding boxes intersect
  if (
    bbox1.x + bbox1.width > bbox2.x &&
    bbox1.y + bbox1.height > bbox2.y &&
    bbox2.x + bbox2.width > bbox1.x &&
    bbox2.y + bbox2.height > bbox1.y
  ) {
    // Check if the two elements actually intersect
    var intersection = root.createSVGRect();
    intersection.x = Math.max(bbox1.x, bbox2.x);
    intersection.y = Math.max(bbox1.y, bbox2.y);
    intersection.width =
      Math.min(bbox1.x + bbox1.width, bbox2.x + bbox2.width) - intersection.x;
    intersection.height =
      Math.min(bbox1.y + bbox1.height, bbox2.y + bbox2.height) - intersection.y;
    return intersection.width > 0 && intersection.height > 0;
  } else {
    return false;
  }
};

// @ts-ignore
if (!SVGElement.prototype.checkIntersection) {
  // @ts-ignore
  SVGElement.prototype.checkIntersection = checkIntersectionPolyfill;
}

/**
 * Renders the chart.
 * @param {RenderState} state
 * @param {Spotfire.DataView} dataView - dataView
 * @param {Spotfire.Size} containerSize - windowSize
 * @param {Partial<Options>} config - config
 * @param {Object} styling - styling
 * @param {Tooltip} tooltip - tooltip
 * @param {any} popoutClosedEventEmitter - popoutClosedEventEmitter
 */
export async function render(
  this: any,
  spotfireMod: Spotfire.Mod,
  state: RenderState,
  plotData: Data,
  xAxisSpotfire: Spotfire.Axis,
  containerSize: Size,
  windowSize: Size,
  calculatedLeftMargin: number,
  config: Partial<Options>,
  styling: {
    generalStylingInfo: GeneralStylingInfo;
    scales: ScaleStylingInfo;
  },
  tooltip: Tooltip,
  container: D3_SELECTION,
  contextMenu: ContextMenu,
  globalZoomSliderContainer: D3_SELECTION,
  isTrellis: boolean = false,
  trellisIndex: number = -1,
  trellisName: string = "",
  trellisRowIndex: number = 0
): Promise<RenderedPanel> {
  if (state.preventRender) {
    Log.green(LOG_CATEGORIES.Rendering)("State prevents render");
    // Early return if the state currently disallows rendering.
    return;
  }

  Log.green(LOG_CATEGORIES.Rendering)("In Render");

  Log.green(LOG_CATEGORIES.Rendering)(
    "Plotdata min/max",
    plotData.yDataDomain.min,
    plotData.yDataDomain.max
  );

  container.style(
    "background-color",
    styling.generalStylingInfo.backgroundColor
  );

  // IMPORTANT - use these to determine if is individual zoom slider!
  // - it's so easy to forget to check both conditions and get into a nasty mess...
  const isTrellisWithIndividualZoom =
    isTrellis && config.individualZoomSlider.value();
  const isTrellisWithGlobalZoom =
    isTrellis &&
    (!config.showZoomSliders.value() || !config.individualZoomSlider.value());

  //d3.select("#mod-container")
  const svg = container
    .append("svg")
    .attr("xmlns", "http://www.w3.org/2000/svg")
    .attr("classed", "main-svg-container");

  // const animationSpeed = state.disableAnimation ? 0 : 500;
  const animationSpeed = 0; // consider doing something more clever with animation in v2.0?

  const rowsToBeMarked: DataViewRow[] = Array();

  Log.green(LOG_CATEGORIES.DebugAnimation)(animationSpeed);

  Log.green(LOG_CATEGORIES.Rendering)(plotData);

  /**
   * Calculating the position and size of the chart
   */

  const margin = {
    top: 20,
    bottom: isTrellis ? 40 : 15,
    left: calculatedLeftMargin,
  };
  const padding = { violinX: 20, betweenPlotAndTable: 5 };
  const width = containerSize.width - margin.left;
  const height = containerSize.height;

  let fontClass = "regularfont";

  if (height < 360 || width < 360) {
    fontClass = "smaller-font";
  } else if (height < 500 || width < 500) {
    fontClass = "small-font";
  } else {
    fontClass = "medium-font";
  }

  Log.green(LOG_CATEGORIES.Rendering)(container.node().getBoundingClientRect());

  Log.green(LOG_CATEGORIES.Rendering)(
    "Show chart size:",
    containerSize,
    width,
    height
  );

  // Remove everything from the container;
  container.selectAll(".summary-table1").remove();
  //container.selectAll("#zoom-slider").remove();

  const g = svg
    .append("g")
    // .attr("id", "dragcont")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  // Prepare for y axis, but don't render it yet
  const isScaleLog = config.yAxisLog.value();

  /**
   * Order categories, build plotData.sumStats (summary statistics)
   */

  let orderedCategories = plotData.categories;
  Log.red(LOG_CATEGORIES.DebugShowAllXValues)(
    "orderedCategories before sort:",
    orderedCategories
  );

  let tempOrderedCategories: any = [];
  Log.green(LOG_CATEGORIES.Rendering)("orderBy", config.orderBy.value());
  if (config.orderBy.value()! != "") {
    //plotData.sumStats
    const orderBySettings = config.orderBy.value()!.split(">");
    // [0] is the name of the property to sort on
    // [1] is the sort direction - one of left, right, unordered
    // Get the property to sort on
    const propertyToSortSettings = SumStatsConfig.find(
      (s: SumStatsSettings) => s.name == orderBySettings[0]
    );

    // Only sort if that property is enabled in the table
    if (
      !Array.from(config.GetStatisticsConfigItems().values()).some(
        (m: StatisticsConfig) =>
          m.tableEnabled && m.name == propertyToSortSettings.name
      )
    ) {
      orderBySettings[1] = "unordered";
    }

    Log.green(LOG_CATEGORIES.Rendering)("orderBySettings", orderBySettings);
    orderedCategories = [];
    plotData.sumStats.forEach((el: any, i: any) => {
      tempOrderedCategories.push({ key: i, value: el });
    });

    if (orderBySettings[1] == "ordered-right") {
      tempOrderedCategories = tempOrderedCategories.sort((a: any, b: any) =>
        d3.descending(
          a.value[propertyToSortSettings.property],
          b.value[propertyToSortSettings.property]
        )
      );
      plotData.sumStats = new Map(
        Array.from(plotData.sumStats).sort((a, b) =>
          d3.descending(
            a[1][propertyToSortSettings.property],
            b[1][propertyToSortSettings.property]
          )
        )
      );
    }
    if (orderBySettings[1] == "ordered-left") {
      tempOrderedCategories = tempOrderedCategories.sort((a: any, b: any) =>
        d3.ascending(
          a.value[propertyToSortSettings.property],
          b.value[propertyToSortSettings.property]
        )
      );
      plotData.sumStats = new Map(
        Array.from(plotData.sumStats).sort((a, b) =>
          // a[0], b[0] is the key of the map
          d3.ascending(
            a[1][propertyToSortSettings.property],
            b[1][propertyToSortSettings.property]
          )
        )
      );
    }

    tempOrderedCategories.forEach((el: any) => {
      orderedCategories.push(el.key);
    });
  }

  // x-axis item for comparison circles
  if (config.comparisonCirclesEnabled.value()) {
    orderedCategories.push("Comparison");
  }

  // Draw x axis

  const xScale = d3
    .scaleBand()
    .range([0, width])
    .domain(orderedCategories) //earlier we extracted the unique categories into an array
    .paddingInner(0) // This is important: it is the space between 2 groups. 0 means no padding. 1 is the maximum.
    // Originally, the padding was set to 0.2 but this led to problems aligning the summary table cells accurately,
    // Therefore, padding has been set to 0... This also reduces the space consumed. Violins touching each other is
    // not a huge issue in my opinion (A. Berridge)
    .paddingOuter(0)
    .align(0);

  //summary columns

  // Render the summary statistics table
  const tableContainer: D3_SELECTION = renderStatisticsTable(
    config,
    styling,
    container,
    margin,
    fontClass,
    plotData,
    orderedCategories,
    xScale.bandwidth(),
    tooltip
  );

  Log.green(LOG_CATEGORIES.Rendering)(
    tableContainer.node().getBoundingClientRect()
  );
  const heightAvailable = Math.max(
    0,
    height -
      tableContainer.node().getBoundingClientRect().height -
      margin.top -
      margin.bottom
  );

  Log.green(LOG_CATEGORIES.Rendering)(
    "height, heightAvailable",
    height,
    heightAvailable,
    "containerSize",
    containerSize,
    tableContainer.node().getBoundingClientRect(),
    tableContainer.node().clientHeight
  );
  //tableContainer.attr("style", "top:" + heightAvailable + "px");
  Log.green(LOG_CATEGORIES.Rendering)(tableContainer.node());

  /**
   * Set the width and height of svg and translate it
   */
  svg.attr(
    "style",
    "width:" +
      (width + margin.left) +
      "px; " +
      "height:" +
      (heightAvailable + 30) +
      "px;"
  );

  const xAxis = d3.axisBottom(xScale);

  // Render the x axis
  g.append("g")
    .attr("class", "x-axis")
    //.attr("transform", "translate(0," + heightAvailable + ")")
    .attr("font-family", styling.scales.font.fontFamily)
    .attr("fill", styling.scales.font.color)
    .attr("font-weight", styling.scales.font.fontWeight)
    .style("font-size", styling.scales.font.fontSize + "px")
    .call(xAxis);

  /**
   * Draw y axis
   */

  let minZoom: number;
  let maxZoom: number;

  if (isTrellisWithIndividualZoom) {
    Log.green(LOG_CATEGORIES.Rendering)(
      config.trellisIndividualZoomSettings.value()
    );
    if (config.trellisIndividualZoomSettings.value() != "") {
      const trellisZoomConfigs: TrellisZoomConfig[] = JSON.parse(
        config.trellisIndividualZoomSettings.value()
      );
      Log.green(LOG_CATEGORIES.Rendering)(trellisZoomConfigs, trellisName);
      const trellisZoomConfig = trellisZoomConfigs.find(
        (d: TrellisZoomConfig) => d.trellisName == trellisName
      );

      if (trellisZoomConfig != undefined) {
        Log.green(LOG_CATEGORIES.Rendering)("found zoom", trellisZoomConfig);
        if (trellisZoomConfig.minZoomUnset) {
          minZoom = plotData.yDataDomain.min;
        } else {
          minZoom = trellisZoomConfig.minZoom; //- tempminZoom * 0.05;
        }
        if (trellisZoomConfig.maxZoomUnset) {
          maxZoom = plotData.yDataDomain.max;
        } else {
          maxZoom = trellisZoomConfig.maxZoom;
        }
      } else {
        minZoom = plotData.yDataDomain.min;
        maxZoom = plotData.yDataDomain.max;
      }
    } else {
      minZoom = plotData.yDataDomain.min;
      maxZoom = plotData.yDataDomain.max;
    }
  } else {
    Log.green(LOG_CATEGORIES.Rendering)(
      "Getting min/max zoom from config if set"
    );
    minZoom = config.yZoomMinUnset.value()
      ? plotData.yDataDomain.min
      : config.yZoomMin.value();
    maxZoom = config.yZoomMaxUnset.value()
      ? plotData.yDataDomain.max
      : config.yZoomMax.value();
  }

  Log.green(LOG_CATEGORIES.Rendering)(
    "config zoom",
    config.yZoomMin.value(),
    config.yZoomMax.value(),
    config.yZoomMinUnset.value(),
    config.yZoomMaxUnset.value()
  );
  Log.green(LOG_CATEGORIES.DebugLogYAxis)("minZoom, maxZoom", minZoom, maxZoom);

  let yScale = d3.scale;
  let ticks: number[];
  if (isScaleLog) {
    yScale = d3
      .scaleSymlog()
      .domain([minZoom, maxZoom]) //y domain using our min and max values calculated earlier
      .range([heightAvailable - padding.betweenPlotAndTable, 0]).constant(1);
    let modulus =
      20 - Math.floor((heightAvailable - padding.betweenPlotAndTable) / 40);
    Log.blue(LOG_CATEGORIES.DebugYScaleTicks)(
      "modulus",
      modulus,
      yScale.ticks()
    );

    ticks = yScale.ticks();
    let currentPower = Math.floor(Math.log10(ticks[0]));
    ticks = ticks.filter((t: number, i: number) => {
      //i %
      //  modulus ==
      //0
      let pow = Math.floor(Math.log10(t));
      Log.blue(LOG_CATEGORIES.DebugYScaleTicks)(
        "pow, currentPow, t",
        pow,
        currentPower,
        t
      );
      if (pow != currentPower) {
        currentPower = pow;
        return true;
      }
      return i == 0 || i == ticks.length - 1;
    });
  } else {
    yScale = d3
      .scaleLinear()
      .domain([minZoom, maxZoom]) //y domain using our min and max values calculated earlier
      //.domain([0,50])
      .range([heightAvailable - padding.betweenPlotAndTable, 0]); //.nice();
    ticks = yScale.ticks((heightAvailable - padding.betweenPlotAndTable) / 40);
  }

  Log.blue(LOG_CATEGORIES.DebugYScaleTicks)(yScale.ticks(4));
  const yAxis = d3
    .axisLeft()
    .scale(yScale)
    .tickFormat(d3.format(config.GetYAxisFormatString()));
  //yAxis.tickValues().filter((t:number) => t == 600000 || t == 700000);
  yAxis.tickValues(ticks);

  Log.green(LOG_CATEGORIES.Rendering)(
    "slider",
    yScale(2.0),
    plotData.yDataDomain.min,
    plotData.yDataDomain.max,
    yScale(plotData.yDataDomain.min),
    yScale(plotData.yDataDomain.max)
  );

  /**
   * Zoom slider
   */
  const verticalSlider = sliderLeft() //!isTrellis || isTrellisWithIndividualZoom ? yScale : undefined)
    .min(plotData.yDataDomain.min)
    .max(plotData.yDataDomain.max)
    .height(heightAvailable - padding.betweenPlotAndTable - 30)
    .step((plotData.yDataDomain.max - plotData.yDataDomain.min) / yAxis.ticks())
    .ticks(1)
    .default([minZoom, maxZoom])
    .on("end ", (val: any) => {
      /*Log.green(LOG_CATEGORIES.Rendering)(val);
            Log.green(LOG_CATEGORIES.Rendering)("zoom on end minZoom, maxZoom", minZoom, maxZoom);
            Log.green(LOG_CATEGORIES.Rendering)("config zoom", config.yZoomMin.value(), config.yZoomMax.value());
            Log.green(LOG_CATEGORIES.Rendering)("zooom val: ", val);*/

      state.disableAnimation = true;

      if (isTrellisWithIndividualZoom) {
        // Keep track of individual zoomed panel so as not to re-render everything
        setTrellisPanelZoomedTitle(trellisName);
        // Current settings
        const trellisZoomConfigs =
          config.trellisIndividualZoomSettings.value() == ""
            ? new Array<TrellisZoomConfig>()
            : JSON.parse(config.trellisIndividualZoomSettings.value());
        Log.green(LOG_CATEGORIES.Rendering)(
          "trellisZoomConfigs",
          trellisZoomConfigs
        );

        const trellisZoomConfig = trellisZoomConfigs?.find(
          (d: TrellisZoomConfig) => {
            Log.green(LOG_CATEGORIES.Rendering)(d);
            return d.trellisName == trellisName;
          }
        );
        Log.green(LOG_CATEGORIES.Rendering)(
          "trellisZoomConfig",
          trellisZoomConfig
        );

        if (trellisZoomConfig != undefined) {
          if (val[0] != plotData.yDataDomain.min) {
            trellisZoomConfig.minZoom = val[0];
            trellisZoomConfig.minZoomUnset = false;
          } else {
            trellisZoomConfig.minZoomUnset = true;
          }
          if (val[1] != plotData.yDataDomain.max) {
            trellisZoomConfig.maxZoom = val[1];
            trellisZoomConfig.maxZoomUnset = false;
          } else {
            trellisZoomConfig.maxZoomUnset = true;
          }
          Log.green(LOG_CATEGORIES.Rendering)(
            JSON.stringify(trellisZoomConfigs)
          );
          // This will trigger a render, but not in time to stop code execution from continuing below
          config.trellisIndividualZoomSettings.set(
            JSON.stringify(trellisZoomConfigs)
          );
        } else {
          // create and setup config for this panel
          trellisZoomConfigs.push(<TrellisZoomConfig>{
            trellisName: trellisName,
            minZoom: val[0],
            maxZoom: val[1],
            minZoomUnset: val[0] == plotData.yDataDomain.min,
            maxZoomUnset: val[1] == plotData.yDataDomain.max,
          });
          Log.green(LOG_CATEGORIES.Rendering)(trellisZoomConfigs);
          Log.green(LOG_CATEGORIES.Rendering)(
            JSON.stringify(trellisZoomConfigs)
          );
          config.trellisIndividualZoomSettings.set(
            JSON.stringify(trellisZoomConfigs)
          );
        }
      } else {
        Log.green(LOG_CATEGORIES.DebugZoomReset)(
          "setting zoom",
          val,
          config.yZoomMin.value(),
          config.yZoomMax.value()
        );
        if (val[0] != plotData.yDataDomain.min) {
          config.yZoomMin.set(val[0]);
          config.yZoomMinUnset.set(false);
        } else {
          config.yZoomMinUnset.set(true);
        }
        if (val[1] != plotData.yDataDomain.max) {
          config.yZoomMax.set(val[1]);
          config.yZoomMaxUnset.set(false);
        } else {
          config.yZoomMaxUnset.set(true);
        }
      }
    });

  verticalSlider.handle(GenerateRoundedRectSvg(14, 14, 3, 3, 3, 3));

  // WARNING: verticalSlider.height() is buggy! Don't use it.

  let sliderSvg: d3.D3_SELECTION;
  if (!isTrellis) {
    Log.green(LOG_CATEGORIES.Rendering)(globalZoomSliderContainer);
    // WARNING: .height()
    globalZoomSliderContainer.selectAll("*").remove();
    Log.green(LOG_CATEGORIES.Rendering)(
      "appending sliderSvg to ",
      svg,
      " for ",
      trellisName
    );
    sliderSvg = globalZoomSliderContainer
      .append("svg")
      .attr("xmlns", "http://www.w3.org/2000/svg")
      .attr("id", "slider-container" + trellisIndex)
      .attr("height", heightAvailable)
      .attr("width", 20);
    sliderSvg
      .append("g")
      .attr("class", "vertical-zoom-slider")
      .attr("transform", "translate(10, " + margin.top + ")")
      .call(verticalSlider);
  } else if (isTrellisWithGlobalZoom) {
    verticalSlider.height(windowSize.height - margin.bottom - margin.top - 10);
    globalZoomSliderContainer.selectAll("*").remove();
    Log.green(LOG_CATEGORIES.Rendering)(
      "appending sliderSvg to ",
      svg,
      " for ",
      trellisName
    );
    sliderSvg = globalZoomSliderContainer
      .append("svg")
      .attr("xmlns", "http://www.w3.org/2000/svg")
      .attr("id", "slider-container" + trellisIndex)
      .attr("height", windowSize.height - 10)
      .attr("width", 20);
    sliderSvg
      .append("g")
      .attr("class", "vertical-zoom-slider")
      .attr("transform", "translate(10, " + margin.top + ")")
      .call(verticalSlider);
  } else {
    // Trellis - individual zoom sliders
    sliderSvg = svg
      .append("svg")
      .attr("xmlns", "http://www.w3.org/2000/svg")
      .attr("id", "slider-container" + trellisIndex)
      .attr("height", containerSize.height);
    sliderSvg.selectAll("*").remove();

    sliderSvg
      .append("g")
      .attr("class", "vertical-zoom-slider")
      .attr("transform", "translate(20, " + margin.top + ")")
      .call(verticalSlider);
  }

  sliderSvg?.on("contextmenu", function (event: PointerEvent) {
    event.preventDefault(); // Prevents browser native context menu from being shown.
    event.stopPropagation(); // Prevents default mod context menu to be shown.
    contextMenu
      .show(event.clientX, event.clientY, [
        {
          text: "Reset Zoom",
          enabled: true,
        },
      ])
      .then(() => {
        config.trellisIndividualZoomSettings.set("");
        config.yZoomMinUnset.set(true);
        config.yZoomMaxUnset.set(true);
      });
  });

  // Render y axis
  g.append("g")
    .attr("class", "axis")
    .style("font-family", styling.scales.font.fontFamily)
    .style("font-weight", styling.scales.font.fontWeight)
    .style("font-size", styling.scales.font.fontSize + "px")
    .style("color", styling.scales.font.color)
    .call(yAxis)
    .on("drag", () => {
      Log.green(LOG_CATEGORIES.Rendering)("drag");
    });

  /**
   * Draw grid lines
   */
  if (config.includeYAxisGrid.value() && styling.scales.line.stroke != "none") {
    Log.green(LOG_CATEGORIES.DebugYScaleTicks)(ticks);
    g.selectAll("line.horizontalGrid")
      .data(yScale.ticks())
      .enter()
      .append("line")
      .attr("class", "horizontal-grid")
      .attr("x1", 0)
      .attr("x2", width)
      .attr("y1", (d: number) => yScale(d))
      .attr("y2", (d: number) => yScale(d))
      .attr("stroke", styling.scales.line.stroke)
      .attr("shape-rendering", "crispEdges");
    //.attr("stroke", styling.scales.line.stroke)

    g.selectAll("line.horizontalGridHover")
      .data(yScale.ticks())
      .enter()
      .append("line")
      .attr("class", "horizontal-grid-hover")
      .attr("style", "opacity:0;")
      .attr("x1", 0)
      .attr("x2", width)
      .attr("y1", (d: number) => yScale(d))
      .attr("y2", (d: number) => yScale(d))
      .attr("stroke", styling.scales.line.stroke)      
      .attr("stroke-width", 10)
      .attr("shape-rendering", "crispEdges")
      //.attr("stroke", styling.scales.line.stroke)  
      .on("mouseover", function (event: d3.event, d: any) {
        tooltip.show(d3.format(config.GetYAxisFormatString())(d));
      })
      .on("mouseover", function (event: d3.event, d: any) {
        tooltip.show(d3.format(config.GetYAxisFormatString())(d));
      })
      .on("mouseout", () => tooltip.hide());
  }

  // Styling of ticks and lines
  container.selectAll(".tick line").attr("stroke", styling.scales.tick.stroke);

  container.selectAll(".domain").attr("stroke", styling.scales.line.stroke);

  /**
   * Trend lines
   */
  g.selectAll(".trend-line").remove();

  const statisticsConfig: Map<string, StatisticsConfig> =
    config.GetStatisticsConfigItems();

  // If no xScale domain we cannot render trend lines as there's nothing on the x-axis!
  if (xScale.domain()[0] != "") {
    Array.from(statisticsConfig.values())
      .filter((l: StatisticsConfig) => l.trendEnabled === true)
      .forEach((r: StatisticsConfig) => {
        const lineSettings = SumStatsConfig.find(
          (e: SumStatsSettings) => e.name === r.name
        );

        Log.green(LOG_CATEGORIES.Rendering)(
          "drawing trend line for: " + lineSettings.property,
          r
        );
        const dashArray = r.dashArray.split(" ");
        let newDasharray: string = "";
        dashArray.forEach((d: any) => {
          newDasharray += Number(d) * 10 + " ";
        });
        g.append("path")
          .datum(
            [...plotData.sumStats]
              .map((d: any) => {
                return {
                  x: d[0],
                  y: d[1][lineSettings.property],
                };
              })
              .filter((d: any) => d.y != null && !isNaN(d.y))
          )
          .attr("class", "trend-line")
          .attr("stroke", r.color)
          .attr("style", "stroke-dasharray: " + newDasharray)
          .attr(
            "d",
            d3
              .line()
              .curve(d3.curveCatmullRom)
              .x((d: any) => xScale(d.x) + xScale.bandwidth() / 2)
              .y((d: any) => yScale(d.y))
          );
        // Add another, wider path that's easier to hover over, and make it transparent
        g.append("path")
          .datum(
            [...plotData.sumStats]
              .map((d: any) => {
                return {
                  x: d[0],
                  y: d[1][lineSettings.property],
                };
              })
              .filter((d: any) => d.y != null && !isNaN(d.y))
          )
          .attr(
            "d",
            d3
              .line()
              .curve(d3.curveCatmullRom)
              .x((d: any) => xScale(d.x) + xScale.bandwidth() / 2)
              .y((d: any) => yScale(d.y))
          )
          .attr("stroke", "transparent")
          .attr("fill", "none")
          .attr("stroke-width", 10)
          .on("mousemove", (event: MouseEvent) => {
            tooltip.show(
              lineSettings.name +
                ": " +
                d3.format(config.GetYAxisFormatString())(
                  yScale.invert(event.clientY - margin.top)
                )
            );
          })
          .on("mouseout", () => tooltip.hide());
      });
  }

  /**
   * Render violin
   */
  if (config.includeViolin.value()) {
    renderViolin(
      plotData,
      xScale,
      yScale,
      height,
      g,
      tooltip,
      xAxisSpotfire,
      state,
      animationSpeed,
      heightAvailable,
      config,
      styling.generalStylingInfo
    );
  }

  /**
   * Render comparison circles if enabled
   */
  if (config.comparisonCirclesEnabled.value()) {
    renderComparisonCircles(
      config,
      g,
      xScale,
      yScale,
      tooltip,
      heightAvailable,
      plotData,
      isScaleLog,
      styling.generalStylingInfo.backgroundColor,
      state
    );
  }

  /**
   * Render box plot if option is selected
   */
  if (config.includeBoxplot.value()) {
    renderBoxplot(
      styling,
      trellisName,
      rowsToBeMarked,
      plotData,
      xScale,
      yScale,
      height,
      g,
      tooltip,
      xAxisSpotfire,
      state,
      animationSpeed,
      config
    );
  }

  /**
   * Add reference lines/points if any are enabled
   */
  g.selectAll(".reference-line").remove();
  Log.green(LOG_CATEGORIES.ReferenceLines)(xScale);
  Array.from(statisticsConfig.values())
    .filter((l: StatisticsConfig) => l.refEnabled === true)
    .forEach((r: StatisticsConfig) => {
      const sumStatsSetting: SumStatsSettings = SumStatsConfig.find(
        (e: SumStatsSettings) => e.name === r.name
      );

      Log.green(LOG_CATEGORIES.ReferenceLines)(
        "Drawing reference line for:" + sumStatsSetting.property
      );
      Log.green(LOG_CATEGORIES.ReferenceLines)(sumStatsSetting);
      const dashArray = r.dashArray.split(" ");
      let newDasharray: string = "";
      dashArray.forEach((d: any) => {
        newDasharray += Number(d) * 10 + " ";
      });
      g.selectAll(".reference-line-" + r.name)
        .data(
          new Map(
            [...plotData.sumStats].filter(
              ([, v]) => v[sumStatsSetting.property] != undefined
            )
          )
        )
        .enter()
        .append("path")
        .attr("d", sumStatsSetting.path(xScale.bandwidth()))
        .classed("reference-line", true)
        .classed("reference-line-" + r.name, true)
        .attr("stroke-dasharray", newDasharray)
        .attr("transform", (d: any) => {
          Log.green(LOG_CATEGORIES.ReferenceLines)(d[0], xScale(d[0]));
          return (
            "translate(" +
            ((xScale(d[0]) ? xScale(d[0]) : 0) + xScale.bandwidth() / 2) +
            "," +
            (yScale(d[1][sumStatsSetting.property]) +
              sumStatsSetting.verticalOffset(xScale.bandwidth())) +
            ") rotate(" +
            sumStatsSetting.rotation +
            ")"
          );
        })
        .attr("stroke", r.color)
        .attr("fill", r.color)
        //.attr("x1", (d: any) => x(d[0]) + x.bandwidth() / 3)
        //.attr("x2", (d: any) => x(d[0]) + x.bandwidth() / 3 + 100)
        .attr("y1", (d: any) => {
          return yScale(d[1][sumStatsSetting.property]);
        })
        .attr("y2", (d: any) => yScale(d[1][sumStatsSetting.property]))
        .on("mouseover", function (event: d3.event, d: any) {
          Log.green(LOG_CATEGORIES.Rendering)(d, event.target);
          tooltip.show(
            d[0] +
              "\n" +
              sumStatsSetting.name +
              ": " +
              d3.format(config.GetYAxisFormatString())(
                d[1][sumStatsSetting.property]
              )
          );
        })
        .on("mouseout", () => tooltip.hide());

      g.selectAll(".reference-linelabel")
        .data(
          new Map(
            [...plotData.sumStats].filter(
              ([, v]) => v[sumStatsSetting.property] != undefined
            )
          )
        )
        .enter()
        .append("text")
        .attr("transform", function (d: any) {
          return (
            "translate(" +
            ((xScale(d[0]) ? xScale(d[0]) : 0) +
              sumStatsSetting.labelHorizOffset(xScale.bandwidth())) +
            "," +
            yScale(d[1][sumStatsSetting.property]) +
            ")"
          );
        })
        .classed(fontClass, true)
        .attr("font-family", styling.scales.font.fontFamily)
        .attr("fill", styling.scales.font.color)
        .attr("font-weight", styling.scales.font.fontWeight)
        .style("font-size", styling.scales.font.fontSize + "px")
        .text(() => sumStatsSetting.name);
    });

  //** Display p-value results from the one-way ANOVA test

  // Add p-value text
  if (config.showPvalue.value()) {
    Log.green(LOG_CATEGORIES.Rendering)(plotData.pValue);
    if (plotData.pValue === "NA") {
      Log.green(LOG_CATEGORIES.Rendering)("ANOVA NA");
      svg
        .append("text")
        .classed(fontClass, true)
        .style("font-family", styling.generalStylingInfo.font.fontFamily)
        .style("fill", styling.generalStylingInfo.font.color)
        .text("One-way ANOVA test is not applicable.")
        .attr("x", margin.left + 10)
        .attr("y", heightAvailable);
    } else {
      svg
        .append("text")
        .classed(fontClass, true)
        .style("font-family", styling.generalStylingInfo.font.fontFamily)
        // SVG text elements use fill to set the color of the text
        .style("fill", styling.generalStylingInfo.font.color)
        .text("P-value:" + plotData.pValue.toFixed(6) + " (one-way ANOVA)")
        .attr("x", margin.left + 10)
        .attr("y", heightAvailable);
    }
  }

  const renderedPanel: RenderedPanel = {
    name: trellisName,
    boundingClientRect: container.node().getBoundingClientRect(),
    getBoundingClientRect() {
      return container.node().getBoundingClientRect();
    },
    mark(x, y, width, height, ctrlKey) {
      Log.green(LOG_CATEGORIES.Marking)(
        "Render Marking panel",
        trellisName,
        x,
        y,
        width,
        height
      );
      rectMark(trellisName, x, y, width, height, ctrlKey);
    },
  };

  return renderedPanel;

  /**
   *
   *
   *  Rectangular marking
   *
   *
   */

  /**
   * Marking violins/box elements/points
   */
  function rectMark(
    trellisName: string,
    selectionBoxX: number,
    selectionBoxY: number,
    selectionBoxWidth: number,
    selectionBoxHeight: number,
    ctrlKey: boolean
  ) {
    svg.selectAll(".test_points").remove();
    svg.selectAll(".test_rect").remove();
    svg.selectAll(".rect-corner").remove();
    svg.selectAll(".rect-shapeinfo").remove();

    const violinMarkables: any = [];

    // set this to true to enable drawing of rects and circles to aid with debugging violin marking
    const DEBUG_VIOLIN_MARKING = false;

    // Adjust selectionBoxX slightly for non-trellis - not sure why this adjustment is necessary, but it works
    // for now.
    if (!isTrellis) {
      selectionBoxX -= 12;
    }

    /**
     *
     * Violin marking
     *
     * */
    // Filter to paths for this trellis panel
    d3.selectAll(".violin-path-markable")
      .filter((d: any) => d.some((v: any) => v.trellis == trellisName))
      .each(function (d: d3.path, i: number, g: NodeList) {
        // If xScale.domain()
        const violinXindex =
          xScale.domain()[0] == "" ? 0 : xScale.domain().indexOf(d[0].category);

        //if (violinXindex > 0) return; // todo - remove. Just for debugging

        Log.green(LOG_CATEGORIES.ViolinMarking)(
          "violinMark",
          d,
          violinXindex,
          xScale.domain()
        );

        // Compute intersection between violin path and marking rectangle
        const path = ShapeInfo.path((g[i] as SVGPathElement).getAttribute("d"));

        /**
         * The logic is quite complicated. Basic premise is to construct a rect
         * that starts at the edge of the x band where we've selected. This is to capture any sticking out bits
         * that we may miss using intersections alone. Need graphics to explain this properly!
         * LHS of violin - extend rect to left-most edge of section of x band
         * RHS - mirror to LHS and use the same logic
         */

        const selectionBoxStartXIndex = Math.floor(
          (selectionBoxX - margin.left) / xScale.bandwidth()
        );
        const selectionBoxEndXIndex = Math.floor(
          (selectionBoxX + selectionBoxWidth - margin.left - 20) /
            xScale.bandwidth()
        );

        // x0 is the left of the current x-axis band in the violin chart
        const bandX0 = xScale.bandwidth() * violinXindex + margin.left;

        // The right hand edge of the x axis band for this violin
        const bandX1 = xScale.bandwidth() * (violinXindex + 1) + margin.left;

        // Does drawing start on the left hand side of the violin?
        const isLhs = selectionBoxX < bandX0 + xScale.bandwidth() / 2;

        const selectionBoxX1 = selectionBoxX + selectionBoxWidth;

        Log.green(LOG_CATEGORIES.ViolinMarking)(
          "violinMark bboxX1 > bandX1",
          selectionBoxX1 > bandX1,
          selectionBoxX,
          selectionBoxX1,
          bandX1
        );

        var intersectionRectWidth: number;

        // VIOLIN PADDING is causing the issue! Need to take this into account and tidy up the logic here.

        if (isLhs) {
          // is marking rectangle to left hand side of violin?
          intersectionRectWidth = selectionBoxX1 - bandX0 - padding.violinX / 2;
        } else {
          intersectionRectWidth = bandX1 - selectionBoxX - padding.violinX / 2;
        }

        Log.green(LOG_CATEGORIES.ViolinMarking)(
          "violinMark",
          "violinXindex",
          "violinXindex",
          violinXindex,
          "selectionBoxStartIndex",
          selectionBoxStartXIndex,
          "selectionBoxEndXIndex",
          selectionBoxEndXIndex
        );
        Log.green(LOG_CATEGORIES.ViolinMarking)(
          "violinMark",
          "isLhs",
          isLhs,
          "selectionBoxX",
          selectionBoxX,
          "bbox.width",
          selectionBoxWidth,
          "x0",
          bandX0,
          "width",
          intersectionRectWidth,
          "bandX1",
          bandX1,
          selectionBoxX - margin.left + selectionBoxWidth,
          "margin.left",
          margin.left
        );

        if (
          violinXindex >= selectionBoxStartXIndex &&
          violinXindex <= selectionBoxEndXIndex
        ) {
          let selectionTop = selectionBoxY;
          let rectHeight = selectionBoxHeight;
          // Need to take the tops and bottoms of the violins into consideration
          // - e.g. if the user starts the marking rectangle above or below the top/bottom
          // of the violin, there will be no intersections there.

          // Determine if top of marking rectangle is above min
          Log.green(LOG_CATEGORIES.ViolinMarking)(
            "violinMark invert(selectionBoxY)",
            yScale.invert(selectionBoxY),
            "max",
            d3.max(d.map((v: any) => v.violinY)),
            "yScale(max)",
            yScale(d3.max(d.map((v: any) => v.violinY)))
          );
          if (
            yScale.invert(selectionBoxY - margin.top) >
              d3.max(d.map((v: any) => v.violinY)) &&
            yScale.invert(selectionBoxY + selectionBoxHeight - margin.top) <
              d3.max(d.map((v: any) => v.violinY))
          ) {
            selectionTop =
              yScale(d3.max(d.map((v: any) => v.violinY))) + margin.top + 1;
            Log.green(LOG_CATEGORIES.ViolinMarking)(
              "violinMark adjusted selectionTop",
              selectionTop
            );
            rectHeight = rectHeight - (selectionTop - selectionBoxY);
          }

          // Now bottom
          if (
            yScale.invert(selectionBoxY + selectionBoxHeight) <
              d3.min(d.map((v: any) => v.violinY)) &&
            yScale.invert(selectionBoxY) > d3.min(d.map((v: any) => v.violinY))
          ) {
            rectHeight =
              yScale(d3.min(d.map((v: any) => v.violinY))) -
              selectionTop +
              margin.top -
              1;
            Log.green(LOG_CATEGORIES.Rendering)(
              "violinMark adjusted rectHeight",
              rectHeight
            );
          }

          Log.green(LOG_CATEGORIES.ViolinMarking)(
            "violinMark selectionBoxY",
            selectionBoxY,
            "selectionBoxHeight",
            selectionBoxHeight,
            "rectHeight",
            rectHeight
          );

          // ShapeInfo is relative to each of the bands of the violin chart. (one per categorical x axis value)
          const interseectionRect = ShapeInfo.rectangle({
            left: 0,
            top: selectionTop - margin.top,
            width: intersectionRectWidth,
            height: rectHeight,
          });

          Log.green(LOG_CATEGORIES.ViolinMarking)(
            "violinMark rect",
            interseectionRect,
            "x0",
            interseectionRect.args[0].x,
            "x1",
            interseectionRect.args[1].x,
            "width",
            interseectionRect.args[1].x - interseectionRect.args[0].x
          );

          if (DEBUG_VIOLIN_MARKING)
            svg
              .append("rect")
              .classed("rect-shapeinfo", true)
              .attr("x", bandX0 + padding.violinX / 2)
              .attr("y", selectionTop)
              .attr("fill", "none")
              .attr("stroke", "black")
              .attr("width", intersectionRectWidth)
              .attr("height", rectHeight);

          const intersections = Intersection.intersect(path, interseectionRect);
          if (intersections.status == "Intersection") {
            Log.green(LOG_CATEGORIES.DebugFirefoxMarking)(
              "violinMark intersections",
              intersections
            );
            // Useful for debugging intersection - draws circles at the computed intersection points
            if (DEBUG_VIOLIN_MARKING)
              svg
                .selectAll(".test_points")
                .data(intersections.points)
                .enter()
                .append("circle")
                .classed("test_points", true)
                .attr(
                  "cx",
                  (d: any) =>
                    padding.violinX / 2 +
                    margin.left +
                    d.x +
                    xScale.bandwidth() * violinXindex
                )
                .attr("cy", (d: any) => d.y + margin.top)
                .attr("r", 5 + 2 * violinXindex)
                .attr("fill", "red");

            // Pairs of points
            const category = d[0].category;
            for (let j = 0; j < intersections.points.length; j += 2) {
              // Guard against j + 1 running off the end of the array
              if (j + 1 < intersections.points.length) {
                violinMarkables.push({
                  category: category,
                  testX1:
                    intersections.points[j].x +
                    padding.violinX / 2 +
                    margin.left +
                    xScale.bandwidth() * violinXindex,
                  testX2:
                    intersections.points[j + 1].x +
                    margin.left +
                    +padding.violinX / 2 +
                    xScale.bandwidth() * violinXindex,
                  testY1: intersections.points[j].y + margin.top,
                  testY2: intersections.points[j + 1].y + margin.top,
                  y1: yScale.invert(intersections.points[j].y),
                  y2: yScale.invert(intersections.points[j + 1].y),
                });
              }
            }

            Log.green(LOG_CATEGORIES.ViolinMarking)(
              "violinMarkables",
              violinMarkables
            );
          }
        }
      });

    if (DEBUG_VIOLIN_MARKING)
      svg
        .selectAll("test_rect")
        .data(violinMarkables)
        .enter()
        .append("rect")
        .classed("test_rect", true)
        .attr("x", (d: any) => Math.min(d.testX1, d.testX2))
        .attr("y", (d: any) => Math.min(d.testY1, d.testY2))
        .attr("width", (d: any) => Math.abs(d.testX1 - d.testX2))
        .attr("height", (d: any) => Math.abs(d.testY2 - d.testY1))
        .attr("stroke", "red")
        .attr("fill", "none");

    //if (DEBUG_VIOLIN_MARKING) return; // Don't mark

    function rect(x: number, y: number, w: number, h: number) {
      return (
        "M" + [x, y] + " l" + [w, 0] + " l" + [0, h] + " l" + [-w, 0] + "z"
      );
    }

    // create an SVG rect for computing bounds
    const markingPath = svg
      .append("path")
      .attr(
        "d",
        rect(
          selectionBoxX,
          selectionBoxY,
          selectionBoxWidth,
          selectionBoxHeight
        )
      )
      // Use visible when debugging marking - it renders a nice black rect that indicates the area of the marking rect
      // .attr("visibility", "visible")
      .attr("visibility", "hidden")
      .attr("fill", "lightgray");

    const svgNode = svg.node();

    // Marking Points
    const markedPoints = d3
      .selectAll(".markable-points")
      .filter(function (d: any, i: number, g: NodeList) {
        if (isTrellis) {
          return (
            d.trellis == trellisName &&
            svgNode.checkIntersection(g[i], markingPath.node().getBBox())
          );
        } else {
          return svgNode.checkIntersection(g[i], markingPath.node().getBBox());
        }
      });

    Log.blue(LOG_CATEGORIES.DebugMarkingOffset)(
      selectionBoxX,
      selectionBoxY,
      selectionBoxWidth,
      selectionBoxHeight
    );
    // Marked box segments. Only allow box segment marking if violin is not shown
    let markedBoxSegments: d3.D3_SELECTION;

    if (!config.includeViolin.value()) {
      markedBoxSegments = d3
        .selectAll(".markable")
        .filter(function (d: any, i: number, g: NodeList) {
          Log.blue(LOG_CATEGORIES.DebugMarkingOffset)(d, i, g);
          if (isTrellis) {
            return (
              d.stats.trellis == trellisName &&
              svgNode.checkIntersection(g[i], markingPath.node().getBBox())
            );
          } else {
            return svgNode.checkIntersection(
              g[i],
              markingPath.node().getBBox()
            );
          }
        });
    }

    Log.green(LOG_CATEGORIES.Rendering)(
      "markedBoxSegments",
      markedBoxSegments?.data()
    );
    Log.green(LOG_CATEGORIES.Rendering)(
      violinMarkables?.length,
      markedPoints?.data().length,
      config.includeViolin.value() || markedBoxSegments?.data().length == 0
    );

    if (
      violinMarkables.length == 0 &&
      markedPoints?.data().length == 0 &&
      (config.includeViolin.value() || markedBoxSegments?.data().length == 0)
    ) {
      state.disableAnimation = true;
      plotData.clearMarking();
      return;
    }
    state.disableAnimation = true;
    spotfireMod.transaction(() => {
      plotData.mark(
        markedPoints.data().map((d: any) => d.row),
        ctrlKey ? "ToggleOrAdd" : "Replace"
      );
      markedBoxSegments?.data().forEach((element: any) => {
        plotData.mark(
          element.dataPoints.map((p: any) => p.row),
          ctrlKey ? "ToggleOrAdd" : "Replace"
        );
      });
      let violinRowsMarkedCount = 0;
      violinMarkables.forEach((element: any) => {
        const minY = Math.min(element.y1, element.y2);
        const maxY = Math.max(element.y1, element.y2);
        const rowsToMark: DataViewRow[] = plotData.dataPoints
          .filter((p) => p.y >= minY && p.y <= maxY && p.category == element.category)
          .map((r) => r.row);

        violinRowsMarkedCount += rowsToMark.length;
        Log.green(LOG_CATEGORIES.Rendering)(
          "violinMarkables",
          rowsToMark,
          minY,
          maxY,
          plotData.dataPoints.filter((p) => p.category == element.category)
        );
        plotData.mark(rowsToMark, ctrlKey ? "ToggleOrAdd" : "Replace");
      });

      // It is possible the user tried to mark regions of the violin with no data; so clear marking if this is the case (e.g. above max/below min)
      if (
        violinRowsMarkedCount == 0 &&
        markedPoints?.data().length == 0 &&
        (config.includeViolin.value() || markedBoxSegments?.data().length == 0)
      ) {
        plotData.clearMarking();
      }
    });
  }
}
