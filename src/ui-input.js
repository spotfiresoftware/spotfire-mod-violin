/*
 * Copyright © 2020. TIBCO Software Inc.
 * This file is subject to the license terms contained
 * in the license file that is distributed with this file.
 */

import { Log, LOG_CATEGORIES } from "./index";

const selectionDiv = document.createElement("div");
selectionDiv.className = "selection";

const selectionBgDiv = document.createElement("div");
selectionBgDiv.className = "selection-bg";

document.querySelector("body").appendChild(selectionBgDiv);
document.querySelector("body").appendChild(selectionDiv);

const clamp = (value, min, max) => Math.min(Math.max(min, value), max);

let selectionPoint = { x: 0, y: 0 };
let meta = { ctrlKey: false, altKey: false };
export const addHandlersSelection = (callback) => {
  document.addEventListener("keydown", (e) => {
    Log.green(LOG_CATEGORIES.Marking)(e.key);
    if (e.key == "Escape") {
      selectionDiv.style.visibility = "hidden";
      selectionBgDiv.style.visibility = "hidden";
      document.removeEventListener("mousemove", mousemove);
      document.removeEventListener("mouseup", mouseup);
    }
  });

  document.onmousedown = (e) => {
    // Hide any warning popup
    Log.green(LOG_CATEGORIES.PopupWarning)(
      e.target,
      e.target.classList,
      "nodeName",
      e.target.nodeName,
      e.target.nodeName == "line",
      e.target.classList
    );
    if (
      !e.target.classList.contains("warning-info-popup") &&
      !e.target.classList.contains("warning-info-para") &&
      !e.target.classList.contains("warning-info-title")
    ) {
      document.querySelector(".warning-info-popup").style.visibility = "hidden";
    }

    if (
      (e.target.nodeName != "svg" && e.target.nodeName != "line") ||
      e.target.classList.contains("dropdown-toggle")
    ) {
      Log.green(LOG_CATEGORIES.Marking)(
        "Returning, not marking due to target not matching"
      );
      return; // do not respond to mouseup on anything other than svg
    }
    if (e.button != 0) {
      // Ignore anything other than the left mouse button
      return;
    }

    //Log.green(LOG_CATEGORIES.Marking)("ui marking", d3.select("#root-container").node().offset());
    if (
      e.target.classList?.contains("markable") ||
      e.target.classList?.contains("markable-points")
    ) {
      Log.green(LOG_CATEGORIES.Marking)(
        "Returning, not marking due to classList not matching"
      );
      return; // Do not start the drag behaviour if an element is clicked
    }
    callback({ dragSelectActive: true });
    const { x, y, ctrlKey, altKey } = e;
    selectionPoint = {
      x: x,
      y: y + (window.scrollY || document.documentElement.scrollTop),
    };
    Log.green(LOG_CATEGORIES.Marking)(
      "ui marking y start",
      selectionPoint,
      selectionPoint.y
    );
    meta = { ctrlKey, altKey };
    selectionDiv.style.left = x + "px";
    selectionDiv.style.top = selectionPoint.y + "px";
    selectionDiv.style.width = "0px";
    selectionDiv.style.height = "0px";

    document.addEventListener("mousemove", mousemove);
    document.addEventListener("mouseup", mouseup);
  };

  const mousemove = (e) => {
    const x = clamp(e.x, 0, window.innerWidth - 2);
    const y = clamp(e.y, 0, window.innerHeight - 2);
    const width = Math.abs(x - selectionPoint.x);
    const height = Math.abs(
      selectionPoint.y -
        (window.scrollY || document.documentElement.scrollTop) -
        y
    );
    Log.green(LOG_CATEGORIES.Marking)("ui marking", x, y, width, height);
    selectionDiv.style.width = width + "px";
    selectionDiv.style.height = height + "px";
    selectionDiv.style.visibility = "visible";
    selectionBgDiv.style.visibility = "visible";

    if (x < selectionPoint.x) selectionDiv.style.left = x + "px";
    if (
      y <
      selectionPoint.y - (window.scrollY || document.documentElement.scrollTop)
    )
      selectionDiv.style.top =
        y + (window.scrollY || document.documentElement.scrollTop) + "px";
  };

  const mouseup = (e) => {
    if (e.target.nodeName != "svg") {
      //return; // do not respond to mouseup on anything other than svg
    }
    var { x, y } = e;
    const width = Math.abs(selectionPoint.x - x);
    const scrollY = window.scrollY || document.documentElement.scrollTop;
    const height = Math.abs(selectionPoint.y - scrollY - y);
    x = x < selectionPoint.x ? x : selectionPoint.x;
    y = y < selectionPoint.y - scrollY ? y : selectionPoint.y - scrollY;

    Log.green(LOG_CATEGORIES.Marking)("ui_y", window.scrollY, "y", y);
    const bottom = y + height;
    selectionDiv.style.visibility = "hidden";
    selectionBgDiv.style.visibility = "hidden";
    Log.green(LOG_CATEGORIES.Marking)("mouseup", width, height, x, y);

    const minSelectionSize = 2;
    if (width > minSelectionSize && height > minSelectionSize) {
      callback({
        dragSelectActive: false,
        selectionDiv,
        x: x,
        right: x + width,
        y: y,
        width,
        height,
        bottom,
        scrollY: scrollY,

        ...meta,
      });
    } else {
      callback({ shouldClearMarking: true });
    }

    document.removeEventListener("mousemove", mousemove);
    document.removeEventListener("mouseup", mouseup);
  };
};
