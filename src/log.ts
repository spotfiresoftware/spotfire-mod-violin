/*
 * Copyright © 2024. Cloud Software Group, Inc.
 * This file is subject to the license terms contained
 * in the license file that is distributed with this file.
 */

/**
 * Use any of these categories to differentiate between sets of log messages. Add a new one
 * at any time to debug a particular piece of functionality.
 */

export enum LOG_CATEGORIES {
  None,
  Data,
  General,
  Settings,
  Stats,
  Coloring,
  Marking,
  ViolinMarking,
  Rendering,
  ComparisonCircles,
  ReferenceLines,
  ShowHideZoomSliders,
  DebugViolinXPos,
  DebugAnimation,
  DebugCtrlKey,
  AggregationWarning,
  ShowHighlightRect,
  DebugShowingMenu,
  DebugStatisticsSettings,
  DebugShowAllXValues,
  DebugComparisonCirclesInTable,
  DebugShowingStatsTable,
  DebugWebPlayerIssue,
  DebugLayout,
  DebugResize,
  DebugFirefoxMarking,
  DebugDataBailout,
  DebugLatestMarking,
  DebugMarkingOffset,
  DebugZoomReset,
  DebugSingleRowMarking,
  DebugLogYAxis,
  DebugYScaleTicks,
  DebugMedian,
  PopupWarning,
  CurrencyFormatting,
  DebugYNaN,
  DebugIndividualYScales,
  DebugResetGlobalZoom,
  InnovativeLogTicks,
  BoxPlotColorBy,
  MultipleYAxisExpressions,
  ColorViolin,
  DebugBigData,
  DebugXaxisFiltering,
  ViolinIndividualScales,
  SumStatsPerformance,
  ConfidenceIntervals,
  DebugViolinIndividualScalesMarking,
  DebugBoxIssue,
  DebugCustomSymLog,
  DebugInnovativeLogticks,
  AsinhScale,
  Horizontal,
  DebugBoxHover,
  LayoutOptimization
}
/**
 * Set this array to any number of categories, or None to hide all logging
 */
const CURRENT_LOG_CATEGORIES: LOG_CATEGORIES[] = [
  LOG_CATEGORIES.DebugResetGlobalZoom,
];
/**
 * Log helper - pass the log category as the first argument, then any number of args as you would with console.log
 * Useful for debugging various parts/functions of the code by enabling/disabling various log categories (CURRENT_LOG_CATEGORIES)
 * @param category
 * @param args
 */

export class Log {
  static green(category: LOG_CATEGORIES): (...args: any) => void {
    if (CURRENT_LOG_CATEGORIES.find((c) => c == LOG_CATEGORIES.None)) {
      return function () { }; // Don't log
    }
    if (CURRENT_LOG_CATEGORIES.find((c) => c == category)) {
      return console.log.bind(
        console,
        `%c${LOG_CATEGORIES[category]}`,
        `background: #FFFFF; color: #31A821`
      );
    } else {
      return function () { };
    }
  }

  static red(category: LOG_CATEGORIES): (...args: any) => void {
    if (CURRENT_LOG_CATEGORIES.find((c) => c == LOG_CATEGORIES.None)) {
      return function () { }; // Don't log
    }
    if (CURRENT_LOG_CATEGORIES.find((c) => c == category)) {
      return console.log.bind(
        console,
        `%c${LOG_CATEGORIES[category]}`,
        `background: #FFFFF; color: #DA5555`
      );
    } else {
      return function () { };
    }
  }

  static blue(category: LOG_CATEGORIES): (...args: any) => void {
    if (CURRENT_LOG_CATEGORIES.find((c) => c == LOG_CATEGORIES.None)) {
      return function () { }; // Don't log
    }
    if (CURRENT_LOG_CATEGORIES.find((c) => c == category)) {
      return console.log.bind(
        console,
        `%c${LOG_CATEGORIES[category]}`,
        `background: #FFFFF; color: #5560DA`
      );
    } else {
      return function () { };
    }
  }
}
