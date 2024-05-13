/*
* Copyright © 2024. Cloud Software Group, Inc.
* This file is subject to the license terms contained
* in the license file that is distributed with this file.
*/

import {
  Controls,
  Mod,
  ModProperty,
  PopoutComponent,
  ContextMenuItem,
  ModPropertyDataType,
} from "spotfire-api";

// @ts-ignore
import * as d3 from "d3";
// @ts-ignore
import { ColorPicker } from "@easylogic/colorpicker";

import { GenerateRoundedRectSvg, LOG_CATEGORIES, Log } from "./index";

// @ts-ignore
import { sliderHorizontal } from "d3-simple-slider";
import {
  StatisticsConfig,
  Options,
  SumStatsSettings,
  SumStatReferenceType,
} from "./definitions";

import { SumStatsConfig } from "./sumstatsconfig";

enum StatisticsConfigType {
  Table,
  Reference,
  Trend,
}

let trellisPlaceholder: HTMLElement;

function AddSection(header: string, container: HTMLElement): HTMLElement {
  const div = document.createElement("div");
  div.classList.add("dropdown-header");
  div.innerHTML = header;
  div.addEventListener("click", (ev: MouseEvent) => ev.stopPropagation());
  container.append(div);

  const form = document.createElement("form");
  form.classList.add("px-4");
  form.classList.add("py-1");
  form.addEventListener("click", (ev: MouseEvent) => ev.stopPropagation());
  container.append(form);

  return form;
}

function AddPlaceholder(container: HTMLElement): HTMLElement {
  const div = document.createElement("div");
  container.append(div);
  return div;
}

function AddCheckbox(
  label: string,
  property: ModProperty,
  container: HTMLElement,
  onCheckedChanged: (checked: boolean, ignoreInitialEvent: boolean) => any
) {
  const div = document.createElement("div");
  div.classList.add("form-check");
  div.classList.add("form-switch");
  div.classList.add("mt-2");

  const input = <HTMLInputElement>document.createElement("input");
  input.classList.add("form-check-input");
  input.setAttribute("type", "checkbox");
  input.setAttribute("name", property.name);

  input.id = "checkbox_" + property.name;

  input.addEventListener("change", (event) => {
    const target = event.currentTarget as HTMLInputElement;
    property.set(target.checked);
    onCheckedChanged(target.checked, false);
  });
  div.append(input);

  const labelElement = document.createElement("label");
  labelElement.classList.add("form-check-label");
  labelElement.setAttribute("for", "checkbox_" + property.name);
  labelElement.innerHTML = label;
  labelElement.addEventListener("click", (ev: MouseEvent) =>
    ev.stopPropagation()
  );
  div.append(labelElement);

  container.append(div);
  if (property.value() == true) {
    input.checked = true;
    onCheckedChanged(true, true);
  }
}

function AddCheckboxForStatsConfig(
  config: Options,
  label: string,
  configItem: StatisticsConfig,
  statisticsConfigType: StatisticsConfigType,
  container: HTMLElement,
  onCheckedChanged: (checked: boolean) => any
): HTMLElement {
  const div = document.createElement("div");
  div.classList.add("form-check");
  div.classList.add("form-switch");
  div.classList.add("mt-2");

  const inputId =
    "checkbox_" +
    label.replace(" ", "_").toLowerCase() +
    "_" +
    configItem.name.toLowerCase();

  const input = <HTMLInputElement>document.createElement("input");
  input.classList.add("form-check-input");
  input.setAttribute("type", "checkbox");

  input.setAttribute("name", inputId);

  //Log.red(LOG_CATEGORIES.DebugStatisticsSettings)("addCheckBoxForStatsConfig configItem", configItem);

  switch (statisticsConfigType) {
    case StatisticsConfigType.Table:
      input.checked = configItem?.tableEnabled;
      break;
    case StatisticsConfigType.Reference:
      input.checked = configItem?.refEnabled;
      break;
    case StatisticsConfigType.Trend:
      input.checked = configItem?.trendEnabled;
      break;
  }

  input.id = inputId;

  input.addEventListener("change", () => {
    Log.green(LOG_CATEGORIES.Settings)("onChange checkbox", configItem);
    switch (statisticsConfigType) {
      case StatisticsConfigType.Table:
        configItem.tableEnabled = input.checked;
        break;
      case StatisticsConfigType.Reference:
        configItem.refEnabled = input.checked;
        break;
      case StatisticsConfigType.Trend:
        configItem.trendEnabled = input.checked;
        break;
    }
    Log.green(LOG_CATEGORIES.Settings)(
      "checking checkbox after",
      config.GetStatisticsConfigItems(),
      configItem
    );
    //Log.green(LOG_CATEGORIES.Settings)("checkChange", JSON.stringify(configArray));
    config.SetStatisticsConfigItem(configItem);
    onCheckedChanged(input.checked);
  });
  div.append(input);

  const labelElement = document.createElement("label");
  labelElement.classList.add("form-check-label");
  labelElement.setAttribute("for", inputId);
  labelElement.innerHTML = label;
  labelElement.addEventListener("click", (ev: MouseEvent) =>
    ev.stopPropagation()
  );
  div.append(labelElement);

  container.append(div);

  return div;
}

function AddStrokeDashArrayDropDown(
  config: Options,
  configName: string,
  settingItem: StatisticsConfig,
  possibleValues: string[],
  container: HTMLElement
) {
  // Get current settings of this line
  const lineSetting = config.GetStatisticsConfigItem(configName);
  const dropdownContainer = d3.select(container);
  const dropDownMenu = dropdownContainer
    .append("DIV")
    .attr("class", "btn-group")
    .on("change", () => {
      Log.green(LOG_CATEGORIES.Settings)("Change");
    });

  Log.red(LOG_CATEGORIES.Settings)(settingItem);

  const line = d3.line()([
    [0, 0],
    [50, 0],
  ]);

  dropDownMenu
    .append("DIV")
    //.attr("class", "dropdown-toggle")
    //.attr("type", "button")
    .attr("id", "stroke_dash_array_dropdown_" + settingItem.name)
    .attr("data-bs-toggle", "dropdown")
    .attr("aria-haspopup", "true")
    .attr("aria-expanded", "false")
    .append("DIV")
    .append("svg")
    .attr("width", "100px")
    //.attr("style", "width: 100px; height 10px")
    .attr("viewBox", "0 0 10, 0.1")

    .append("path")
    .attr("class", "trend-line-config-path")
    .attr("d", line)
    .attr("class", "trend-line-config")
    .attr("stroke", "black") // would be nice to colour by the setting, but not easy to get notified of changes without a lot of spaghetti logic
    .attr("style", "stroke-dasharray: " + lineSetting.dashArray)
    .on("click", (event: d3.MouseEvent) => {
      event.currentTarget.setAttribute("aria-expanded", "true");
    });

  const menu = dropDownMenu.append("DIV").attr("class", "dropdown-menu");

  for (const dashArray of possibleValues) {
    menu
      .append("DIV")
      .attr("class", "dropdown-item")
      .attr("data-for-stroke-array", dashArray)
      .classed(
        "stroke-array-dropdown-highlighted",
        dashArray == lineSetting.dashArray
      )
      .attr(
        "id",
        "stroke_dash_array_dropdown_" +
          settingItem.name +
          "_" +
          dashArray.replace(" ", "_")
      )
      .on("click", function (this: HTMLElement, event: d3.MouseEvent) {
        // Get current settings of this line
        const settingItem = config.GetStatisticsConfigItem(configName);
        Log.green(LOG_CATEGORIES.Settings)("settingItem", settingItem);
        //settingItem.dashArray = event.currentTarget.
        Log.green(LOG_CATEGORIES.Settings)(
          event.currentTarget.id.substring(28 + settingItem.name.length)
        );
        settingItem.dashArray = event.currentTarget.id
          .substring(28 + settingItem.name.length)
          .replace("_", " ");
        Log.green(LOG_CATEGORIES.Settings)(
          "dashArray to set: ",
          settingItem.dashArray
        );
        config.SetStatisticsConfigItem(settingItem);
        Log.red(LOG_CATEGORIES.Settings)(event.currentTarget);
        d3.select(this.parentNode).classed("show", false);
        d3.select(this.parentNode).classed("hide", true);

        d3.select("#stroke_dash_array_dropdown_" + settingItem.name)
          .select("svg")
          .selectAll("*")
          .remove();

        d3.select("#stroke_dash_array_dropdown_" + settingItem.name)
          .select("svg")
          .append("path")
          .attr("class", "trend-line-config-path")
          .attr("d", line)
          .attr("class", "trend-line-config")
          .attr("stroke", "black") // would be nice to colour by the setting, but not easy to get notified of changes without a lot of spaghetti logic
          .attr("style", "stroke-dasharray: " + settingItem.dashArray);
        //event.stopPropagation();
        menu.selectAll("DIV").each(function (this: HTMLElement) {
          Log.green(LOG_CATEGORIES.Settings)("d", this, menu.selectAll("DIV"));
          d3.select(this).classed(
            "stroke-array-dropdown-highlighted",
            this.getAttribute("data-for-stroke-array") == settingItem.dashArray
          );
        });
      })
      .append("svg")
      //.attr("style", "width: 100px; height 10px")
      .attr("viewBox", "0 0 10, 0.1")

      .append("path")
      .attr("d", line)
      .attr("class", "trend-line-config")
      .attr("stroke", "black") // would be nice to colour by the setting, but not easy to get notified of changes without a lot of spaghetti logic
      .attr("style", "stroke-dasharray: " + dashArray);
  }
}

function AddNumericDropDown(
  label: string,
  possibleValues: number[],
  property: ModProperty,
  container: HTMLElement
): HTMLElement {
  const div = document.createElement("div");
  div.classList.add("mt-2");

  const labelElement = document.createElement("label");
  labelElement.classList.add("form-check-label");
  labelElement.setAttribute("for", "select_" + property.name);
  labelElement.innerHTML = label;
  div.append(labelElement);

  const newSelect = <HTMLSelectElement>document.createElement("select");
  newSelect.classList.add("form-control");
  newSelect.setAttribute("type", "select");
  newSelect.setAttribute("name", property.name);
  possibleValues.forEach((value) => {
    const option = <HTMLOptionElement>document.createElement("option");
    option.text = value.toString();
    newSelect.append(option);
  });

  newSelect.selectedIndex = possibleValues.indexOf(property.value());
  newSelect.id = "select_" + property.name;

  newSelect.addEventListener("change", (event) => {
    const target = event.currentTarget as HTMLSelectElement;
    property.set(possibleValues[target.selectedIndex]);
  });
  div.append(newSelect);
  container.append(div);

  return div;
}

function AddDivider(container: HTMLElement) {
  const div = document.createElement("div");
  div.classList.add("dropdown-divider");
  div.addEventListener("click", (ev: MouseEvent) => ev.stopPropagation());
  div.addEventListener("contextmenu", (event: MouseEvent) =>
    event.stopPropagation()
  );
  container.append(div);
}

//<div class="dropdown-divider"></div>

function AddRadioButton(
  property: ModProperty,
  values: any[],
  container: HTMLElement,
  onChanged: (value: any) => any
): HTMLElement {
  const radioContainer = document.createElement("div");
  values.forEach((element) => {
    const div = document.createElement("div");
    div.setAttribute("data-keepOpenOnClick", "");
    div.classList.add("form-check");
    div.addEventListener("click", (event) => {
      event.stopPropagation();
    });
    div.addEventListener("contextmenu", (event: Event) =>
      event.stopPropagation()
    );

    //div.classList.add("mt-2");

    const input = <HTMLInputElement>document.createElement("input");
    input.classList.add("form-check-input");
    input.setAttribute("type", "radio");
    input.setAttribute("name", property.name);
    input.setAttribute("value", element.value);
    if (element.value == property.value()) input.checked = true;
    input.id = "radio_" + property.name + "_" + element.value;

    input.addEventListener("change", (event) => {
      const target = event.currentTarget as HTMLInputElement;
      Log.red(LOG_CATEGORIES.PopupWarning)(
        "about to call onChanged",
        onChanged
      );
      onChanged(target.getAttribute("value"));
      if (target.checked) property.set(target.getAttribute("value"));
      event.stopPropagation();
    });

    div.append(input);

    const labelElement = document.createElement("label");
    labelElement.classList.add("form-check-label");
    labelElement.setAttribute(
      "for",
      "radio_" + property.name + "_" + element.value
    );
    labelElement.innerHTML = element.text;
    div.append(labelElement);
    radioContainer.append(div);
  });
  container.append(radioContainer);
  return radioContainer;
}

function AddTextfield(
  label: string,
  property: ModProperty,
  container: HTMLElement,
  shallApplyOnKeyPress: boolean = false,
  maxCharacters: number = -1
) {
  //<input class="form-control form-control-sm" type="text" placeholder=".form-control-sm" aria-label=".form-control-sm example">

  const labelElement = document.createElement("label");
  labelElement.classList.add("form-check-label");
  labelElement.classList.add("mt-2");
  labelElement.setAttribute("for", "textfield_" + property.name);
  labelElement.innerHTML = label;
  container.append(labelElement);

  const div = <HTMLInputElement>document.createElement("input");
  div.classList.add("form-control");
  div.classList.add("form-control-sm");
  div.setAttribute("type", "text");
  div.id = "textfield_" + property.name;
  div.value = property.value();

  div.addEventListener("change", (event) => {
    const target = event.currentTarget as HTMLInputElement;
    property.set(target.value);
  });

  div.addEventListener("keypress", (event) => {
    const target = event.currentTarget as HTMLInputElement;
    if (maxCharacters != -1 && target.value.length > maxCharacters) {
      target.value = target.value.substring(0, maxCharacters - 1);
      target.focus();
      event.stopPropagation();
      Log.green(LOG_CATEGORIES.CurrencyFormatting)("maxchars");
      return;
    }

    if (event.key === "Enter" || shallApplyOnKeyPress) {
      property.set(event.key);
      target.focus();
      Log.green(LOG_CATEGORIES.CurrencyFormatting)(
        "applying on keypress",
        target.value
      );
    }
  });

  container.append(div);
}

/**
 *
 * @param configName
 * @param property
 * @param configObject
 * @param container
 * @param colorPickerContainer
 */
function AddColorfield(
  config: Options,
  configName: string,
  property: ModProperty,
  container: HTMLElement,
  colorPickerContainer: HTMLElement,
  isForStatisticsConfig = false,
  configIndex = 0
): HTMLElement {
  Log.green(LOG_CATEGORIES.ColorViolin)(configName, property);

  const colorPickerId = property.name + "_colorpicker" + configIndex;
  const colorPickerBodyId = property.name + "_colorpickerBody" + configIndex;
  Log.red(LOG_CATEGORIES.ColorViolin)(
    "selectors",
    colorPickerId,
    colorPickerBodyId
  );

  const dropdownElementDiv = document.createElement("div");
  dropdownElementDiv.classList.add("dropdown-item");
  dropdownElementDiv.addEventListener("contextmenu", (event: Event) =>
    event.stopPropagation()
  );
  dropdownElementDiv.setAttribute("data-bs-toggle", "modal");
  dropdownElementDiv.setAttribute("data-bs-target", "#" + colorPickerId);

  if (!isForStatisticsConfig)
    dropdownElementDiv.innerHTML = configName + "&nbsp";

  const dropdownElementD3 = d3.select(dropdownElementDiv);

  const svgForRect = dropdownElementD3
    .append("svg")
    .attr("width", 20)
    .attr("height", 20);

  const rect = svgForRect
    .append("rect")
    .attr("x", 5)
    .attr("y", 5)
    .attr("width", 20)
    .attr("height", 20)
    .attr("stroke", "black")
    .attr(
      "fill",
      !isForStatisticsConfig
        ? property.value()
        : (property.value() as string).trim() == ""
        ? []
        : config.GetStatisticsConfigItem(configName).color
    );

  container.append(dropdownElementDiv);

  let colorPicker = document.getElementById(colorPickerId);
  if (!colorPicker) {
    colorPicker = document.createElement("div");
    colorPicker.classList.add("modal");
    colorPicker.classList.add("fade");
    colorPicker.classList.add("bg-transparent");
    colorPicker.id = colorPickerId;
    colorPicker.setAttribute("tabindex", "-1");
    colorPicker.setAttribute("role", "dialog");
    // modal.setAttribute("aria-labelledby", property.name + "_colorpickerLabel");
    colorPicker.setAttribute("aria-hidden", "true");
    colorPicker.addEventListener("contextmenu", (event: Event) =>
      event.stopPropagation()
    );
    const colorPickerOuter = document.createElement("div");
    colorPickerOuter.classList.add("modal-dialog");
    colorPickerOuter.classList.add("modal-dialog-centered");
    colorPickerOuter.classList.add("modal-sm");
    colorPickerOuter.setAttribute("role", "document");

    const colorPickerContent = document.createElement("div");
    colorPickerContent.classList.add("modal-content");
    colorPickerContent.classList.add("bg-transparent");
    colorPickerContent.classList.add("border-0");
    colorPickerContent.setAttribute("width", "fit-content");

    const colorPickerHeader = document.createElement("div");
    colorPickerHeader.classList.add("modal-body");
    const colorPickerFooter = document.createElement("div");
    colorPickerFooter.classList.add("modal-body");
    colorPickerFooter.classList.add("text-center");
    const colorPickerOkButton = document.createElement("button");
    colorPickerOkButton.classList.add("btn");
    colorPickerOkButton.classList.add("btn-primary");
    colorPickerOkButton.classList.add("float-right");
    colorPickerOkButton.innerHTML = "OK";
    colorPickerOkButton.setAttribute("data-bs-dismiss", "modal");
    colorPickerOkButton.setAttribute("type", "button");
    const colorPickerCancelButton = document.createElement("button");
    colorPickerCancelButton.classList.add("btn");
    colorPickerCancelButton.classList.add("btn-light");
    colorPickerCancelButton.classList.add("float-right");
    colorPickerCancelButton.innerHTML = "Cancel";
    colorPickerCancelButton.setAttribute("data-bs-dismiss", "modal");
    colorPickerCancelButton.setAttribute("type", "button");
    colorPickerCancelButton.addEventListener("contextmenu", (event: Event) =>
      event.stopPropagation()
    );
    colorPickerCancelButton.addEventListener("click", (event: Event) =>
      event.stopPropagation()
    );

    colorPickerFooter.append(colorPickerOkButton);
    colorPickerFooter.append(colorPickerCancelButton);

    let colorToSet: any = "";
    colorPickerOkButton.addEventListener("click", (event: Event) => {
      colorPickerOkButton.setAttribute("data-bs-dismiss", "modal");
      Log.green(LOG_CATEGORIES.Settings)("close me");
      //event.stopPropagation();
      if (isForStatisticsConfig) {
        const configItem = config.GetStatisticsConfigItem(configName);
        configItem.color = colorToSet;
        Log.green(LOG_CATEGORIES.DebugStatisticsSettings)(
          "statisticsConfigItem OK button",
          configItem
        );
        config.SetStatisticsConfigItem(configItem);
        rect.attr("fill", colorToSet);
        //property.set(JSON.stringify(statisticsConfigItems));
      } else {
        rect.attr("fill", colorToSet);
        property.set(colorToSet);
      }

      colorPicker.setAttribute("visible", "false");
      event.stopPropagation();
    });
    colorPickerOkButton.addEventListener("contextmenu", (event: Event) =>
      event.stopPropagation()
    );

    //Log.green(LOG_CATEGORIES.Settings)(colorPickerCloseButton);

    /*
                const modalclosetext= document.createElement("h6");
                modalclosetext.classList.add("text-light");
                modalclosetext.classList.add("d-inline");
                modalclosetext.innerHTML = "CLOSE";
                modalHeader.append(modalclosetext);*/

    const colorPickerBody = document.createElement("div");
    colorPickerBody.classList.add("modal-header");
    colorPickerBody.classList.add("d-flex");
    colorPickerBody.classList.add("justify-content-center");
    colorPickerBody.classList.add("flex-nowrap");
    colorPickerBody.classList.add("bg-transparent");
    colorPickerBody.classList.add("border-0");
    colorPickerBody.id = colorPickerBodyId;

    colorPickerBody.addEventListener("click", (event: Event) =>
      event.stopPropagation()
    );
    colorPickerBody.addEventListener("contextmenu", (event: Event) =>
      event.stopPropagation()
    );
    colorPickerContainer.append(colorPicker);
    colorPicker.append(colorPickerOuter);
    colorPickerOuter.append(colorPickerContent);
    colorPickerContent.append(colorPickerHeader);
    colorPickerContent.append(colorPickerBody);
    colorPickerContent.append(colorPickerFooter);

    Log.green(LOG_CATEGORIES.Settings)(
      "checking before colorpicker",
      property.value()
    );

    new ColorPicker({
      color: !isForStatisticsConfig
        ? property.value()
        : config.GetStatisticsConfigItem(configName).color, // init color code
      type: "chromedevtool", // or 'sketch',  default type is 'chromedevtool'
      position: "inline",
      container: colorPickerBody,
      outputFormat: "hex",
      format: "hex",
      swatchTitle: configName,
      onChange(color: any) {
        Log.green(LOG_CATEGORIES.Settings)("colorpicker onchange");
        colorToSet = color;
      },

      onDestroy() {
        Log.green(LOG_CATEGORIES.Settings)("ColorPicker destroy");
      },
    });
  }

  return dropdownElementDiv;
}

function AddNumberfield(
  label: string,
  property: ModProperty,
  container: HTMLElement,
  min: number,
  max: number
): HTMLElement {
  //<input class="form-control form-control-sm" type="text" placeholder=".form-control-sm" aria-label=".form-control-sm example">

  const labelElement = document.createElement("label");
  labelElement.classList.add("form-check-label");
  labelElement.classList.add("mt-2");
  labelElement.setAttribute("for", "textfield_" + property.name);
  labelElement.innerHTML = label;
  container.append(labelElement);

  const div = <HTMLInputElement>document.createElement("input");
  div.classList.add("form-control");
  div.classList.add("form-control-sm");
  div.setAttribute("type", "number");
  div.setAttribute("min", min.toString());
  div.setAttribute("max", max.toString());
  div.id = "textfield_" + property.name;
  div.value = property.value();

  div.addEventListener("change", (event) => {
    const target = event.currentTarget as HTMLInputElement;
    property.set(target.value);
  });

  div.addEventListener("keypress", (event) => {
    if (event.key === "Enter") {
      const target = event.currentTarget as HTMLInputElement;
      property.set(target.value);
    }
  });

  container.append(div);
  return div;
}

function AddSlider(
  label: string,
  property: ModProperty,
  container: HTMLElement,
  min: number,
  max: number,
  step: number,
  tickValues: number[] = null,
  showTickNumbers = true
): HTMLElement {
  const div = document.createElement("DIV");
  container.append(div);
  const labelElement = document.createElement("label");
  labelElement.classList.add("form-check-label");
  labelElement.classList.add("mt-2");
  labelElement.setAttribute("for", "textfield_" + property.name);
  labelElement.innerHTML = label;
  div.append(labelElement);
  const slider = sliderHorizontal()
    .min(min)
    .max(max)
    .step(step)
    .silentValue(property.value())
    .tickFormat(showTickNumbers ? null : () => {})
    .width(95)
    .displayValue(true)
    .on("end", (val: any) => {
      property.set(val);
    });
  slider.handle(GenerateRoundedRectSvg(14, 14, 3, 3, 3, 3));

  Log.green(LOG_CATEGORIES.Settings)("tickValues", tickValues);
  if (tickValues != null) {
    Log.green(LOG_CATEGORIES.Settings)(tickValues);
    slider.tickValues(tickValues);
  } else {
    slider.ticks((max - min) / step);
  }

  const element = d3.select(div).append("svg");

  element
    .attr("width", 120)
    .attr("height", 50)
    .append("g")
    .attr("transform", "translate(15,10)")
    .call(slider);

  return div;
}

export function createSettingsPopout(
  config: Options,
  isTrellis: boolean,
  dropDownContainer: HTMLElement
) {
  dropDownContainer.addEventListener("click", (ev: MouseEvent) =>
    ev.stopPropagation()
  );

  /* Help - removed for now. TODO: consider re-adding it
    const labelElement = document.createElement("a");
    labelElement.classList.add("dropdown-item");
    //labelElement.classList.add("btn");
    //labelElement.classList.add("btn-secondary");
    labelElement.setAttribute("href", "#");
    labelElement.setAttribute("data-bs-toggle", "modal");
    //labelElement.setAttribute("role", "button");
    labelElement.setAttribute("data-bs-target", "#helpModal");
    labelElement.innerHTML = "Help";
    dropDownContainer.append(labelElement);
    AddDivider(dropDownContainer); */

  let section = AddSection("Appearance - Zoom Sliders", dropDownContainer);
  let placeholder = AddPlaceholder(section);

  const zoomSliderOptionsPlaceholder = AddPlaceholder(section);
  AddCheckbox(
    "Show Zoom Slider" + (isTrellis ? "s" : ""),
    config.showZoomSliders,
    placeholder,
    (checked: boolean, ignoreInitialEvent: boolean) => {
      if (!(checked && isTrellis)) {
        d3.select(zoomSliderOptionsPlaceholder).selectAll("*").remove();
        if (!ignoreInitialEvent) {
          // Reset zoom
          Log.red(LOG_CATEGORIES.DebugZoomReset)("resetting zoom");
          config.ResetGlobalZoom();
        }
      }
    }
  );

  AddDivider(dropDownContainer);

  section = AddSection("Appearance - Violin", dropDownContainer);
  placeholder = AddPlaceholder(section);

  const violinOptionsPlaceholder = AddPlaceholder(section);
  AddCheckbox(
    "Show Violin",
    config.includeViolin,
    placeholder,
    (checked: boolean) => {
      if (checked) {
        AddRadioButton(
          config.drawViolinUnderBox,
          [
            { text: "Draw Violin Under Box", value: true },
            { text: "Draw Violin Over Box", value: false },
          ],
          violinOptionsPlaceholder,
          () => {}
        );

        AddSlider(
          "Bandwidth",
          config.violinBandwidth,
          violinOptionsPlaceholder,
          0.01,
          0.1,
          0.001,
          [0.01, 0.1]
        );
        AddRadioButton(
          config.violinSmoothness,
          [
            { text: "Coarse", value: 10 },
            { text: "Medium", value: 256 },
            { text: "Smooth", value: 512 },
          ],
          violinOptionsPlaceholder,
          () => {}
        );

        AddCheckbox(
          "Limit Violin to Data Extents",
          config.violinLimitToExtents,
          violinOptionsPlaceholder,
          () => {}
        );

        if (config.areColorAndXAxesMatching) {
          AddCheckbox(
            "Used Fixed Color",
            config.useFixedViolinColor,
            violinOptionsPlaceholder,
            (checked: boolean) => {
              if (checked) {
                AddColorfield(
                  config,
                  "Violin Color",
                  config.violinColor,
                  violinOptionsPlaceholder,
                  document.getElementById("modalscontainer")
                );
              }
            }
          );
        } else {
          AddColorfield(
            config,
            "Violin Color",
            config.violinColor,
            violinOptionsPlaceholder,
            document.getElementById("modalscontainer")
          );
        }
      } else {
        d3.select(violinOptionsPlaceholder).selectAll("*").remove();
      }
    }
  );

  AddDivider(dropDownContainer);
  section = AddSection("Appearance - Box", dropDownContainer);
  placeholder = AddPlaceholder(section);
  const boxOptionsPlaceholder = AddPlaceholder(section);
  AddCheckbox(
    "Show Box Plot",
    config.includeBoxplot,
    placeholder,
    (checked: boolean) => {
      if (checked) {
        AddSlider(
          "Box Size",
          config.boxWidth,
          boxOptionsPlaceholder,
          1,
          10,
          1,
          [],
          false
        );
        AddSlider(
          "Marker Size",
          config.circleSize,
          boxOptionsPlaceholder,
          1,
          10,
          1,
          [],
          false
        );
      }

      AddCheckbox(
        "Show 95% Confidence Interval of the Mean",
        config.show95pctConfidenceInterval,
        boxOptionsPlaceholder,
        () => {}
      );

      if (!config.areColorAndXAxesMatching) {
        AddColorfield(
          config,
          "Box Color<br/>(except outliers)",
          config.boxPlotColor,
          boxOptionsPlaceholder,
          document.getElementById("modalscontainer")
        );
      } else {
        AddCheckbox(
          "Use Fixed Color",
          config.useFixedBoxColor,
          boxOptionsPlaceholder,
          (checked: boolean) => {
            if (checked && config.areColorAndXAxesMatching) {
              AddColorfield(
                config,
                "Box Color",
                config.boxPlotColor,
                boxOptionsPlaceholder,
                document.getElementById("modalscontainer")
              );
            }
          }
        );
      }
    }
  );

  AddDivider(dropDownContainer);

  section = AddSection("Appearance - Summary Table", dropDownContainer);
  placeholder = AddPlaceholder(section);
  AddSlider(
    "Font Scaling Factor",
    config.summaryTableFontScalingFactor,
    placeholder,
    0.5,
    2,
    0.1,
    [0.5, 2]
  );

  AddDivider(dropDownContainer);
  section = AddSection("Comparison Circles", dropDownContainer);
  placeholder = AddPlaceholder(section);
  const comparisonCirclesOptionsPlaceholder = AddPlaceholder(section);
  AddCheckbox(
    "Show Comparison Circles",
    config.comparisonCirclesEnabled,
    placeholder,
    (checked: boolean) => {
      if (checked) {
        AddNumericDropDown(
          "Alpha level",
          [0.01, 0.05, 0.1],
          config.comparisonCirclesAlpha,
          comparisonCirclesOptionsPlaceholder
        );
      } else {
        d3.select(comparisonCirclesOptionsPlaceholder).selectAll("*").remove();
      }
    }
  );

  AddDivider(dropDownContainer);

  section = AddSection("X-axis", dropDownContainer);
  AddRadioButton(
    config.xAxisFiltered,
    [
      { text: "All values", value: false },
      { text: "Non-empty values", value: true },
    ],
    section,
    () => {}
  );

  if (isTrellis) {
    AddDivider(dropDownContainer);
    section = AddSection("Y-axis Trellis", dropDownContainer);
    AddRadioButton(
      config.yScalePerTrellisPanel,
      [
        { text: "Single Y Scale", value: false },
        { text: "Individual Scale per Panel", value: true },
      ],
      section,
      () => {
        config.ResetGlobalZoom();
      }
    );
  }

  AddDivider(dropDownContainer);
  section = AddSection("Y-axis", dropDownContainer);

  AddRadioButton(
    config.yAxisScaleType,
    [
      { text: "Linear", value: "linear" },
      { text: "Symmetrical Log (experimental)", value: "symlog" },
    ],
    section,
    (value: any) => {
      Log.red(LOG_CATEGORIES.PopupWarning)("changed to ", value);
      if (value == "symlog") {
        config.symLogWarningDismissed.set(false);
      }
    }
  );

  AddCheckbox("Show gridlines", config.includeYAxisGrid, section, () => {});
  AddCheckbox("Show P-Value", config.showPvalue, section, () => {});

  AddDivider(dropDownContainer);
  section = AddSection("Y-axis Formatting", dropDownContainer);
  placeholder = AddPlaceholder(section);
  let yAxisCustomizationPlaceholder = AddPlaceholder(section);

  AddRadioButton(
    config.yAxisFormatType,
    [
      { text: "Exponent", value: "exponent" },
      { text: "Floating Point", value: "floatingPoint" },
      { text: "Short Number Format", value: "shortNumber" },
      { text: "Currency", value: "currency" },
    ],
    placeholder,
    (value: any) => {
      // Remove any controls that customize the format
      d3.select(yAxisCustomizationPlaceholder).remove();
      AddDecimalPlacesSlider(yAxisCustomizationPlaceholder, value);
      if (value == "currency") {
        AddCurrencyChooser(yAxisCustomizationPlaceholder);

        // Default for currency is 2 decimal places
        config.yAxisDecimals.set(2);
      }

      // Default for short number format is 3 significant figures
      if (value == "shortNumber") {
        config.yAxisDecimals.set(3);
      }

      AddThousandsCheckBoxIfNeeded(
        yAxisCustomizationPlaceholder,
        config.yAxisFormatType.value()
      );
    }
  );

  function AddDecimalPlacesSlider(container: HTMLElement, formatType: string) {
    if (formatType == "exponent" || formatType == "floatingPoint") {
      AddSlider("Decimal Places", config.yAxisDecimals, container, 0, 12, 1);
    } else if (formatType != "currency") {
      AddSlider(
        "Significant Figures",
        config.yAxisDecimals,
        container,
        0,
        12,
        1
      );
    }
  }

  function AddThousandsCheckBoxIfNeeded(
    container: HTMLElement,
    formatType: string
  ) {
    if (
      formatType != "shortNumber" &&
      formatType != "exponent" &&
      formatType != "currency"
    )
      AddCheckbox(
        "Use Thousands Separator",
        config.yAxisUseThousandsSeparator,
        container,
        () => {}
      );
  }

  function AddCurrencyChooser(container: HTMLElement) {
    AddTextfield(
      "Currency Symbol",
      config.yAxisCurrencySymbol,
      container,
      true,
      1
    );
  }

  if (config.yAxisFormatType.value() == "currency") {
    AddCurrencyChooser(yAxisCustomizationPlaceholder);
  }

  AddDecimalPlacesSlider(
    yAxisCustomizationPlaceholder,
    config.yAxisFormatType.value()
  );

  AddThousandsCheckBoxIfNeeded(
    yAxisCustomizationPlaceholder,
    config.yAxisFormatType.value()
  );

  AddDivider(dropDownContainer);
  section = AddSection("Statistics Measures", dropDownContainer);

  //config.statisticsConfig.set("");
  const strokeDashArrayOptions = [
    "0",
    "1",
    "1 4",
    "1 6",
    "1 4 1",
    "1 5",
    "2",
    "2 1",
    "2 2",
    "2 3",
    "2 4",
    "2 5",
    ".5 1 1.5",
  ];

  const statisticsConfigTable = document.createElement("table");
  statisticsConfigTable.style.border = "none";

  //statisticsConfig = [];
  SumStatsConfig.forEach((entry: SumStatsSettings, index: number) => {
    // Does a setting value exist for this key? If so, use it. If not, create it
    let statisticsConfigItem = config.GetStatisticsConfigItem(entry.name);

    Log.green(LOG_CATEGORIES.Settings)(
      "statisticsConfigItem",
      statisticsConfigItem
    );

    let tableRow = document.createElement("TR");
    let td = document.createElement("TD");
    td.style.border = "none";
    td.setAttribute("colspan", "3");
    td.innerHTML = statisticsConfigItem.name;

    tableRow.append(td);

    statisticsConfigTable.append(tableRow);

    tableRow = document.createElement("TR");

    td = document.createElement("TD");
    td.setAttribute("colspan", "2");

    // Check box for statistics table
    AddCheckboxForStatsConfig(
      config,
      "Statistics Table",
      statisticsConfigItem,
      StatisticsConfigType.Table,
      td,
      () => {}
    );

    tableRow.append(td);
    statisticsConfigTable.append(tableRow);
    const options: HTMLElement[] = [];
    Log.green(LOG_CATEGORIES.Settings)("options", options);

    const lineConfigTableRow = document.createElement("TR");

    // Check box for Reference line/point
    if (entry.path != undefined) {
      AddCheckboxForStatsConfig(
        config,
        entry.type == SumStatReferenceType.Line
          ? "Reference Line"
          : "Reference Point",
        statisticsConfigItem,
        StatisticsConfigType.Reference,
        td,
        (checked: boolean) => {
          if (checked && !statisticsConfigItem.trendEnabled) {
            AddLineConfig(statisticsConfigItem, lineConfigTableRow, index);
          } else if (!checked && !statisticsConfigItem.trendEnabled) {
            d3.select(lineConfigTableRow).selectAll("*").remove();
          }
        }
      );

      tableRow = document.createElement("TR");

      td = document.createElement("TD");
      td.setAttribute("colspan", "2");

      // Check box for trend line
      AddCheckboxForStatsConfig(
        config,
        "Trend Line",
        statisticsConfigItem,
        StatisticsConfigType.Trend,
        td,
        (checked: boolean) => {
          const configItem = config.GetStatisticsConfigItem(entry.name);
          Log.green(LOG_CATEGORIES.DebugStatisticsSettings)(
            "configItem Trend Line",
            configItem
          );
          if (checked && !configItem.refEnabled) {
            AddLineConfig(statisticsConfigItem, lineConfigTableRow, index);
          } else if (!checked && !configItem.refEnabled) {
            d3.select(lineConfigTableRow).selectAll("*").remove();
          }
        }
      );

      if (
        statisticsConfigItem.refEnabled ||
        statisticsConfigItem.trendEnabled
      ) {
        AddLineConfig(statisticsConfigItem, lineConfigTableRow, index);
      }
    }

    tableRow.append(td);
    statisticsConfigTable.append(tableRow);
    statisticsConfigTable.append(lineConfigTableRow);

    // Add a separator at the end of every group of statistics config items
    tableRow = document.createElement("TR");
    td = document.createElement("TD");
    td.setAttribute("colspan", "2");
    AddDivider(td);
    tableRow.append(td);
    statisticsConfigTable.append(tableRow);
  });

  section.append(statisticsConfigTable);

  if (isTrellis) {
    addTrellisSettings(dropDownContainer, config);
  }

  function AddLineConfig(
    statisticsConfigItem: StatisticsConfig,
    optionsTableRow: HTMLElement,
    index: number
  ) {
    Log.green(LOG_CATEGORIES.Settings)("Adding options");
    let td = document.createElement("TD");
    td.style.border = "none";
    AddStrokeDashArrayDropDown(
      config,
      statisticsConfigItem.name,
      statisticsConfigItem,
      strokeDashArrayOptions,
      td
    );
    optionsTableRow.append(td);

    td = document.createElement("TD");
    td.style.border = "none";
    td.style.textAlign = "right";
    AddColorfield(
      config,
      statisticsConfigItem.name,
      config.statisticsConfig,
      td,
      document.getElementById("modalscontainer"),
      true,
      index
    );
    optionsTableRow.append(td);
  }
}

export function addTrellisSettings(
  dropDownContainer: HTMLElement,
  config: Options
) {
  const placeholder = AddPlaceholder(dropDownContainer);
  AddDivider(placeholder);
  const section = AddSection("Trellis", placeholder);
  AddNumberfield(
    "Max Number of Columns",
    config.maxColumnsPerPage,
    section,
    1,
    6
  );
  AddNumberfield("Max Number of Rows", config.maxRowsPerPage, section, 1, 6);
  trellisPlaceholder = placeholder;
}

export function removeTrellisSettings() {
  d3.select(trellisPlaceholder).remove();
}
