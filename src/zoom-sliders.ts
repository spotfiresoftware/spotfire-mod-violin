// @ts-ignore
import { sliderLeft } from "d3-simple-slider";
// @ts-ignore
import * as d3 from "d3";
import { D3_SELECTION, Data, Options, TrellisZoomConfig } from "./definitions";
import { Log, LOG_CATEGORIES } from "./log";
import {
  calculateMinMaxZoom,
  GenerateRoundedRectSvg,
} from "./utility-functions";
import { ContextMenu } from "spotfire-api";

export function renderGlobalZoomSlider(
  globalZoomSliderContainer: D3_SELECTION,
  contextMenu: ContextMenu,
  config: Partial<Options>,
  yScale: d3.scale,
  plotData: Data,
  height: number,
  isTrellis: boolean,
  isTrellisWithIndividualYscale: boolean,
  setTrellisPanelZoomedTitle: (title: string) => void
) {
  // Global zoom slider

  const { minZoom, maxZoom } = calculateMinMaxZoom(
    isTrellisWithIndividualYscale,
    config,
    "",
    plotData
  );
  const verticalSlider = createZoomSlider(
    yScale,
    plotData,
    config,
    minZoom,
    maxZoom,
    isTrellisWithIndividualYscale,
    "",
    setTrellisPanelZoomedTitle
  );
  let sliderSvg: d3.D3_SELECTION;

  if (!isTrellis) {
    Log.green(LOG_CATEGORIES.Rendering)(globalZoomSliderContainer);
    // WARNING: .height()
    globalZoomSliderContainer.selectAll("*").remove();

    sliderSvg = globalZoomSliderContainer
      .append("svg")
      .attr("xmlns", "http://www.w3.org/2000/svg")
      .attr("id", "slider-container" + 0)
      .attr("height", height)
      .attr("width", 20);
    sliderSvg
      .append("g")
      .attr("class", "vertical-zoom-slider")
      // @todo - margin
      .attr("transform", "translate(10, " + 10 / 2 + ")")
      .call(verticalSlider);
  } else if (config.showZoomSliders.value() && !isTrellisWithIndividualYscale) {
    // Show global zoom slider - zoom sliders are enabled, and a single y scale is selected
    verticalSlider.height(height);
    globalZoomSliderContainer.selectAll("*").remove();

    sliderSvg = globalZoomSliderContainer
      .append("svg")
      .attr("xmlns", "http://www.w3.org/2000/svg")
      .attr("id", "slider-container" + 0)
      .attr("height", height)
      .attr("width", 20);
    sliderSvg
      .append("g")
      .attr("class", "vertical-zoom-slider")
      // @todo - margin
      .attr("transform", "translate(10, " + 10 + ")")
      .call(verticalSlider);
  }

  // Reset zoom
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
        if (isTrellis && config.yScalePerTrellisPanel.value()) {
          const trellisZoomConfigs = config.GetTrellisZoomConfigs();

          Log.blue(LOG_CATEGORIES.DebugIndividualYScales)(trellisZoomConfigs);

          let trellisZoomConfig = trellisZoomConfigs.find(
            (zc: TrellisZoomConfig) => zc.trellisName == ""
          );

          if (trellisZoomConfig != undefined) {
            trellisZoomConfig.minZoomUnset = true;
            trellisZoomConfig.maxZoomUnset = true;
          }

          // Keep track of the panel we are resetting
          setTrellisPanelZoomedTitle("");

          // Persist the individual zoom settings
          config.trellisIndividualZoomSettings.set(
            JSON.stringify(trellisZoomConfigs)
          );
        } else {
          Log.green(LOG_CATEGORIES.DebugResetGlobalZoom)("Resetting");
          config.ResetGlobalZoom();
        }
      });
  });
}

export function createZoomSlider(
  yScale: d3.scale,
  plotData: Data,
  config: Partial<Options>,
  minZoom: number,
  maxZoom: number,
  isTrellisWithIndividualYscale: boolean,
  trellisName: string,
  setTrellisPanelZoomedTitle: (title: string) => void
): any {
  Log.green(LOG_CATEGORIES.DebugResetGlobalZoom)(
    "minZoom, maxZoom",
    minZoom,
    maxZoom
  );
  /**
   * Zoom slider
   */
  const verticalSlider = sliderLeft(
    // @todo - check - is this OK?
    yScale.copy([plotData.yDataDomain.min, plotData.yDataDomain.max])
  )
    //.min(plotData.yDataDomain.min)
    //.max(plotData.yDataDomain.max)
    //.height(heightAvailable - padding.betweenPlotAndTable - 30)
    //.step((plotData.yDataDomain.max - plotData.yDataDomain.min) / yAxis.ticks())
    //.ticks(1)

    .default([minZoom, maxZoom])
    .on("end ", (val: any) => {
      if (isTrellisWithIndividualYscale) {
        // Keep track of individual zoomed panel so as not to re-render everything
        setTrellisPanelZoomedTitle(trellisName);
        // Current settings
        const trellisZoomConfigs = config.GetTrellisZoomConfigs();
        Log.green(LOG_CATEGORIES.DebugIndividualYScales)(
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
          Log.red(LOG_CATEGORIES.DebugIndividualYScales)(
            "Before setting",
            JSON.stringify(trellisZoomConfigs)
          );
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
          Log.red(LOG_CATEGORIES.DebugIndividualYScales)(
            "After setting",
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
        Log.green(LOG_CATEGORIES.DebugResetGlobalZoom)(
          "setting zoom",
          val,
          config.yZoomMin.value(),
          config.yZoomMax.value()
        );
        if (val[0] != plotData.yDataDomain.min) {
          config.yZoomMin.set(val[0]);
          Log.green(LOG_CATEGORIES.DebugResetGlobalZoom)(
            "setting yZoomMinUnset to false"
          );
          config.yZoomMinUnset.set(false);
        } else {
          config.yZoomMinUnset.set(true);
        }
        if (val[1] != plotData.yDataDomain.max) {
          config.yZoomMax.set(val[1]);
          Log.green(LOG_CATEGORIES.DebugResetGlobalZoom)(
            "setting yZoomMaxUnset to false"
          );
          config.yZoomMaxUnset.set(false);
        } else {
          config.yZoomMaxUnset.set(true);
        }
      }
    });

  verticalSlider.handle(GenerateRoundedRectSvg(14, 14, 3, 3, 3, 3));

  return verticalSlider;
}
