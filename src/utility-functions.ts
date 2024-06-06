/*
 * Copyright © 2024. Cloud Software Group, Inc.
 * This file is subject to the license terms contained
 * in the license file that is distributed with this file.
 */

import { Log, LOG_CATEGORIES } from "./log";
import { Options, Data, TrellisZoomConfig } from "./definitions";

/**
 * Adjust color to be lighter or darker
 * @param hexCode - the color to adjust
 * @param amount - positive values lighten the color, negative darken it
 * @returns
 */
export function adjustColor(hexCode: String, amount: number): string {
    const color = parseInt(hexCode?.replace("#", ""), 16);
    const r = (color & 0xff0000) / 0x10 ** 4;
    const g = (color & 0x00ff00) / 0x10 ** 2;
    const b = color & 0x0000ff;
  
    const newR = Math.max(0, Math.min(r + amount, 0xff));
    const newG = Math.max(0, Math.min(g + amount, 0xff));
    const newB = Math.max(0, Math.min(b + amount, 0xff));
  
    return (
      "#" +
      newR.toString(16).padStart(2, "0") +
      newG.toString(16).padStart(2, "0") +
      newB.toString(16).padStart(2, "0")
    );
  }
  
  export function GenerateRoundedRectSvg(
    width: number,
    height: number,
    tl: number,
    tr: number,
    br: number,
    bl: number
  ) {
    const top = width - tl - tr;
    const right = height - tr - br;
    const bottom = width - br - bl;
    const left = height - bl - tl;
    return `
      M${tl - 7},-7
      h${top}
      a${tr},${tr} 0 0 1 ${tr},${tr}
      v${right}
      a${br},${br} 0 0 1 -${br},${br}
      h-${bottom}
      a${bl},${bl} 0 0 1 -${bl},-${bl}
      v-${left}
      a${tl},${tl} 0 0 1 ${tl},-${tl}
      z
  `;
  }
  
  /**
   * Given a background color, determine a suitable background color for table headers
   * @param backgroundColor - the background color
   */
  export function getComplementaryColor(backgroundColor: String) {
    const color = parseInt(backgroundColor.replace("#", ""));
    if (color < 0x7fffff) {
      // lighten
      Log.green(LOG_CATEGORIES.Coloring)(
        "adjust lighter",
        backgroundColor,
        adjustColor(backgroundColor, 0x10)
      );
      return adjustColor(backgroundColor, 0x10);
    } else {
      // darken
      Log.green(LOG_CATEGORIES.Coloring)(
        "adjust darker",
        backgroundColor,
        adjustColor(backgroundColor, -0x3f)
      );
      return adjustColor(backgroundColor, -0x09);
    }
  }
  
  /**
   * Given a background color, determine a suitable color for highlighted comparison circles
   * @param backgroundColor - the background color
   */
  export function getComparisonCircleHighlightedColor(backgroundColor: String) {
    const color = parseInt(backgroundColor.replace("#", ""));
    if (color < 0x7fffff) {
      // lighten
      Log.green(LOG_CATEGORIES.Coloring)(
        "adjust lighter",
        backgroundColor,
        adjustColor(backgroundColor, 0x10)
      );
      return adjustColor(backgroundColor, 0xff);
    } else {
      // darken
      Log.green(LOG_CATEGORIES.Coloring)(
        "adjust darker",
        backgroundColor,
        adjustColor(backgroundColor, -0x3f)
      );
      return adjustColor(backgroundColor, -0xff);
    }
  }
  
  /**
   * Given a background color, determine a suitable color for table borders
   * @param backgroundColor - the background color
   */
  export function getBorderColor(backgroundColor: String) {
    const color = parseInt(backgroundColor.replace("#", ""));
    if (color < 0x7fffff) {
      // lighten
      Log.green(LOG_CATEGORIES.Coloring)(
        "adjust lighter",
        backgroundColor,
        adjustColor(backgroundColor, 0x10)
      );
      return adjustColor(backgroundColor, 0x20);
    } else {
      // darken
      Log.green(LOG_CATEGORIES.Coloring)(
        "adjust darker",
        backgroundColor,
        adjustColor(backgroundColor, -0x3f)
      );
      return adjustColor(backgroundColor, -0x20);
    }
  }
  
  /**
   * Given a background color, determine a suitable color for table borders
   * @param backgroundColor - the background color
   */
  export function getMarkerHighlightColor(backgroundColor: String) {
    const color = parseInt(backgroundColor.replace("#", ""));
    if (color < 0x7fffff) {
      // Return black
      return "#FFFFFF";
    } else {
      // return white
      return "#000000";
    }
  }
  
  /**
   * Given a background color, determine a suitable contrasting color
   * @param backgroundColor - the background color
   */
  export function getContrastingColor(backgroundColor: String): string {
    const color = parseInt(backgroundColor.replace("#", ""));
    if (color < 0x7fffff) {
      // lighten
      Log.green(LOG_CATEGORIES.Coloring)(
        "adjust lighter",
        backgroundColor,
        adjustColor(backgroundColor, 0x10)
      );
      return adjustColor(backgroundColor, 0x70);
    } else {
      // darken
      Log.green(LOG_CATEGORIES.Coloring)(
        "adjust darker",
        backgroundColor,
        adjustColor(backgroundColor, -0x3f)
      );
      return adjustColor(backgroundColor, -0x70);
    }
  }
  
  export function getBoxBorderColor(boxColor: String): string {
    if (boxColor == undefined) {
      Log.red(LOG_CATEGORIES.ColorViolin)("uh oh", boxColor);
      return "darkgray";
    }
    const color = parseInt(boxColor.replace("#", ""));
    return adjustColor(boxColor, -0x50);
  }
  
  export function calculateMinMaxZoom(
    isTrellisWithIndividualYscale: boolean,
    config: Partial<Options>,
    trellisName: string,
    plotData: Data
  ) {
    let minZoom: number;
    let maxZoom: number;
  
    if (isTrellisWithIndividualYscale) {
      Log.green(LOG_CATEGORIES.Rendering)(
        config.trellisIndividualZoomSettings.value()
      );
      if (
        config.showZoomSliders.value() &&
        config.trellisIndividualZoomSettings.value() != ""
      ) {
        const trellisZoomConfigs = config.GetTrellisZoomConfigs();
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
      Log.green(LOG_CATEGORIES.DebugResetGlobalZoom)(      
        "yZoomMinUnset", config.yZoomMinUnset.value(),
        "yZoomMaxUnset", config.yZoomMaxUnset.value(),        
        config.yZoomMinUnset.value() ? "getting from plotData" : "getting from config",
        config.yZoomMaxUnset.value() ? "getting from plotData" : "getting from config"
      );
      minZoom = config.yZoomMinUnset.value()
        ? plotData.yDataDomain.min
        : config.yZoomMin.value();
      maxZoom = config.yZoomMaxUnset.value()
        ? plotData.yDataDomain.max
        : config.yZoomMax.value();

        Log.green(LOG_CATEGORIES.DebugResetGlobalZoom)(
            "min/max zoom plotdata",
            plotData.yDataDomain.min, plotData.yDataDomain.max,
            "min/max zoom config",
            config.yZoomMin.value(), config.yZoomMax.value()
          );
    }
    return { minZoom, maxZoom };
  }