/*
* Copyright © 2024. Cloud Software Group, Inc.
* This file is subject to the license terms contained
* in the license file that is distributed with this file.
*/

import { Log, LOG_CATEGORIES } from "./log";

// @ts-ignore
import * as d3 from "d3";
import { SumStatsSettings, SumStatReferenceType } from "./definitions";

function horizontalLineGenerator(x0: number, x1: number) {
  return d3.line()([
    [x0, 0],
    [x1, 0],
  ]);
}

const SumStatsConfig: SumStatsSettings[] = [
  {
    name: "Count",
    property: "count",
    type: SumStatReferenceType.Line,
    format: "~s",
    size: function () {
      return 0;
    },
    path: function (xBandwidth: number) {
      return horizontalLineGenerator(-1 * (xBandwidth / 4), xBandwidth / 4);
    },
    labelHorizOffset: function (xBandwidth: number) {
      return (3 * xBandwidth) / 4;
    },
    labelVerticalOffset: 0,
    verticalOffset: function () {
      return 0;
    },
    dashArray: 3.1,
    rotation: 0,
  },
  {
    name: "Min",
    property: "min",
    type: SumStatReferenceType.Point,
    size: function (xBandwidth: number) {
      Log.green(LOG_CATEGORIES.General)(xBandwidth / 8);
      return xBandwidth / 8;
    },
    path: function (xBandwidth: number) {
      return d3.symbol().type(d3.symbolTriangle).size(this.size(xBandwidth));
    },
    labelHorizOffset: function (xBandwidth: number) {
      // yes this is bandwidth * 0.5, but leaving the calc here for greater tweakability in future
      return (3 * xBandwidth) / 6;
    },
    labelVerticalOffset: 18,
    verticalOffset: function (xBandwidth: number) {
      // From: https://stackoverflow.com/questions/52107733/d3-triangle-positioning-to-an-exact-point
      function getWidth(a: number) {
        return Math.sqrt((4 * a) / Math.sqrt(3));
      }
      function getHeight(w: number) {
        return (Math.sqrt(3) * w) / 2;
      }

      return getHeight(getWidth(this.size(xBandwidth)));
    },
    dashArray: 0,
    rotation: 0,
  },
  {
    name: "Max",
    property: "max",
    type: SumStatReferenceType.Point,
    size: function (xBandwidth: number) {
      return xBandwidth / 8;
    },
    path: function (xBandwidth: number) {
      return d3.symbol().type(d3.symbolTriangle).size(this.size(xBandwidth));
    },
    labelHorizOffset: function (xBandwidth: number) {
      return (3 * xBandwidth) / 6;
    },
    labelVerticalOffset: -10,
    verticalOffset: function (xBandwidth: number) {
      function getWidth(a: number) {
        return Math.sqrt((4 * a) / Math.sqrt(3));
      }
      function getHeight(w: number) {
        return (Math.sqrt(3) * w) / 2;
      }

      return -1 * getHeight(getWidth(this.size(xBandwidth)));
    },
    dashArray: 0,
    rotation: 180,
  },
  {
    name: "Avg",
    property: "avg",
    type: SumStatReferenceType.Line,
    size: function () {
      return 0;
    },
    path: function (xBandwidth: number) {
      return horizontalLineGenerator(-1 * (xBandwidth / 4), xBandwidth / 4);
    },
    labelHorizOffset: function (xBandwidth: number) {
      return (3 * xBandwidth) / 4;
    },
    labelVerticalOffset: -4,
    verticalOffset: function () {
      return 0;
    },
    dashArray: 2.2,
    rotation: 0,
  },
  {
    name: "Q1",
    property: "q1",
    type: SumStatReferenceType.Line,
    size: function () {
      return 0;
    },
    path: function (xBandwidth: number) {
      return horizontalLineGenerator(-1 * (xBandwidth / 4), xBandwidth / 4);
    },
    labelHorizOffset: function (xBandwidth: number) {
      return (3 * xBandwidth) / 4;
    },
    labelVerticalOffset: 0,
    verticalOffset: function () {
      return 0;
    },
    dashArray: 2.8,
    rotation: 0,
  },
  {
    name: "Q3",
    property: "q3",
    type: SumStatReferenceType.Line,
    size: function () {
      return 0;
    },
    path: function (xBandwidth: number) {
      return horizontalLineGenerator(-1 * (xBandwidth / 4), xBandwidth / 4);
    },
    labelHorizOffset: function (xBandwidth: number) {
      return (3 * xBandwidth) / 4;
    },
    labelVerticalOffset: 0,
    verticalOffset: function () {
      return 0;
    },
    dashArray: 3.1,
    rotation: 0,
  },
  {
    name: "Median",
    property: "median",
    type: SumStatReferenceType.Line,
    size: function () {
      return 0;
    },
    path: function (xBandwidth: number) {
      return horizontalLineGenerator(-1 * (xBandwidth / 4), xBandwidth / 4);
    },
    labelHorizOffset: function (xBandwidth: number) {
      return (3 * xBandwidth) / 4;
    },
    labelVerticalOffset: 5,
    verticalOffset: function () {
      return 0;
    },
    dashArray: 3.1,
    rotation: 0,
  },
  {
    name: "IQR",
    property: "interQuartileRange",
    type: SumStatReferenceType.Line,
    size: function () {
      return 0;
    },
    path: function (xBandwidth: number) {
      return horizontalLineGenerator(-1 * (xBandwidth / 4), xBandwidth / 4);
    },
    labelHorizOffset: function (xBandwidth: number) {
      return (3 * xBandwidth) / 4;
    },
    labelVerticalOffset: 0,
    verticalOffset: function () {
      return 0;
    },
    dashArray: 3.1,
    rotation: 0,
  },
  {
    name: "StdDev",
    property: "stdDev",
    type: SumStatReferenceType.Line,
    size: function () {
      return 0;
    },
    path: function (xBandwidth: number) {
      return horizontalLineGenerator(-1 * (xBandwidth / 4), xBandwidth / 4);
    },
    labelHorizOffset: function (xBandwidth: number) {
      return (3 * xBandwidth) / 4;
    },
    labelVerticalOffset: 0,
    verticalOffset: function () {
      return 0;
    },
    dashArray: 3.1,
    rotation: 0,
  },
  {
    name: "LAV",
    property: "lav",
    type: SumStatReferenceType.Line,
    size: function () {
      return 0;
    },
    path: function (xBandwidth: number) {
      return horizontalLineGenerator(-1 * (xBandwidth / 4), xBandwidth / 4);
    },
    labelHorizOffset: function (xBandwidth: number) {
      return (3 * xBandwidth) / 4;
    },
    labelVerticalOffset: 0,
    verticalOffset: function () {
      return 0;
    },
    dashArray: 3.1,
    rotation: 0,
  },
  {
    name: "UAV",
    property: "uav",
    type: SumStatReferenceType.Line,
    size: function () {
      return 0;
    },
    path: function (xBandwidth: number) {
      return horizontalLineGenerator(-1 * (xBandwidth / 4), xBandwidth / 4);
    },
    labelHorizOffset: function (xBandwidth: number) {
      return (3 * xBandwidth) / 4;
    },
    labelVerticalOffset: 0,
    verticalOffset: function () {
      return 0;
    },
    dashArray: 3.1,
    rotation: 0,
  },
  {
    name: "Outliers",
    property: "outlierCount",
    format: "~s",
    type: SumStatReferenceType.Line,
    size: function () {
      return 0;
    },
    path: function (xBandwidth: number) {
      return horizontalLineGenerator(-1 * (xBandwidth / 4), xBandwidth / 4);
    },
    labelHorizOffset: function (xBandwidth: number) {
      return (3 * xBandwidth) / 4;
    },
    labelVerticalOffset: 0,
    verticalOffset: function () {
      return 0;
    },
    dashArray: 3.1,
    rotation: 0,
  },
  {
    name: "Outlier PCT",
    property: "outlierPct",
    format: ".1%",
    type: SumStatReferenceType.Line,
    size: function () {
      return 0;
    },
    path: function (xBandwidth: number) {
      return horizontalLineGenerator(-1 * (xBandwidth / 4), xBandwidth / 4);
    },
    labelHorizOffset: function (xBandwidth: number) {
      return (3 * xBandwidth) / 4;
    },
    labelVerticalOffset: 0,
    verticalOffset: function () {
      return 0;
    },
    dashArray: 3.1,
    rotation: 0,
  },
  {
    name: "LIF",
    property: "lif",
    type: SumStatReferenceType.Line,
    size: function () {
      return 0;
    },
    path: function (xBandwidth: number) {
      return horizontalLineGenerator(-1 * (xBandwidth / 4), xBandwidth / 4);
    },
    labelHorizOffset: function (xBandwidth: number) {
      return (3 * xBandwidth) / 4;
    },
    labelVerticalOffset: 0,
    verticalOffset: function () {
      return 0;
    },
    dashArray: 3.1,
    rotation: 0,
  },
  {
    name: "UIF",
    property: "uif",
    type: SumStatReferenceType.Line,
    size: function () {
      return 0;
    },
    path: function (xBandwidth: number) {
      return horizontalLineGenerator(-1 * (xBandwidth / 4), xBandwidth / 4);
    },
    labelHorizOffset: function (xBandwidth: number) {
      return (3 * xBandwidth) / 4;
    },
    labelVerticalOffset: 0,
    verticalOffset: function () {
      return 0;
    },
    dashArray: 3.1,
    rotation: 0,
  },
  {
    name: "LOF",
    property: "lof",
    type: SumStatReferenceType.Line,
    size: function () {
      return 0;
    },
    path: function (xBandwidth: number) {
      return horizontalLineGenerator(-1 * (xBandwidth / 4), xBandwidth / 4);
    },
    labelHorizOffset: function (xBandwidth: number) {
      return (3 * xBandwidth) / 4;
    },
    labelVerticalOffset: 0,
    verticalOffset: function () {
      return 0;
    },
    dashArray: 3.1,
    rotation: 0,
  },
  {
    name: "UOF",
    property: "uof",
    type: SumStatReferenceType.Line,
    size: function () {
      return 0;
    },
    path: function (xBandwidth: number) {
      return horizontalLineGenerator(-1 * (xBandwidth / 4), xBandwidth / 4);
    },
    labelHorizOffset: function (xBandwidth: number) {
      return (3 * xBandwidth) / 4;
    },
    labelVerticalOffset: 0,
    verticalOffset: function () {
      return 0;
    },
    dashArray: 3.1,
    rotation: 0,
  },
];

export { SumStatsConfig };
