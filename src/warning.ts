import { Axis, FontInfo, ModProperty } from "spotfire-api";
import { getContrastingColor } from "./index";

/**
 * Create a Spotfire-style warning when "Cards by" gets changed from default value.
 * @param {HTMLElement} modDiv The div / text card to have the new button
 * @param {string} textColor
 * @param {Spotfire.Axis} axis
 * @param {Spotfire.ModProperty<boolean>} ignoreProperty
 */
export function createWarning(
    reloadTrigger: ModProperty<number>,
    fontInfo: FontInfo,
    backgroundColor: string,
    warningMessage: string,
    fixButtonText: string,
    fixFunction: () => void,
    ignoreProperty: ModProperty<boolean>
) {
    // get warning div
    var warningDiv = document.getElementById("warning-message") as HTMLDivElement;

    warningDiv.style.display = "block";
    warningDiv.innerHTML = "";

    var errorLayout = document.createElement("div");
    errorLayout.setAttribute("class", "error-layout");

    var errorContainer = document.createElement("div");
    errorContainer.setAttribute("class", "error-container");

    var errorText = document.createElement("div");
    errorText.setAttribute("class", "error-text");
    errorText.style.color = fontInfo.color;
    errorText.style.fontFamily = fontInfo.fontFamily;
    errorText.style.fontSize = fontInfo.fontSize.toString() + "px";
    errorText.style.fontWeight = fontInfo.fontWeight;
    errorText.style.fontStyle = fontInfo.fontStyle;
    errorText.innerHTML = warningMessage;
    errorContainer.appendChild(errorText);

    var buttonRow = document.createElement("div");
    buttonRow.setAttribute("class", "warning-row");

    var ignoreButtonContainer = document.createElement("div");
    var fixButtonContainer = document.createElement("div");

    const disableUI = function () {
        ignoreButtonContainer.onclick = null;
        fixButtonContainer.onclick = null;
        errorContainer.style.visibility = "hidden";
    };

    // create 'Ignore' button
    ignoreButtonContainer.setAttribute("class", "spotfire-button-flex spotfire-button-white");
    var ignoreButtonDiv = document.createElement("div");
    ignoreButtonDiv.setAttribute("class", "spotfire-button-text");
    ignoreButtonDiv.style.color = getContrastingColor("#00000");
    ignoreButtonDiv.style.fontFamily = fontInfo.fontFamily;
    ignoreButtonDiv.style.fontSize = fontInfo.fontSize.toString();
    ignoreButtonDiv.style.fontWeight = fontInfo.fontWeight;
    ignoreButtonDiv.style.fontStyle = fontInfo.fontStyle;
    ignoreButtonDiv.textContent = "Keep current setting";
    ignoreButtonDiv.onclick = (e) => {
        reloadTrigger.set(Math.random());
        ignoreProperty.set(true);
        disableUI();
        e.stopPropagation();
    };

    ignoreButtonContainer.appendChild(ignoreButtonDiv);    

    // create 'Fix' button
    fixButtonContainer.setAttribute("class", "spotfire-button-flex spotfire-button-blue");
    var fixButtonDiv = document.createElement("div");
    fixButtonDiv.setAttribute("class", "spotfire-button-text");
    fixButtonDiv.textContent = fixButtonText;   
    fixButtonDiv.style.fontFamily = fontInfo.fontFamily;
    fixButtonDiv.style.fontSize = fontInfo.fontSize.toString();    
    fixButtonDiv.style.fontStyle = fontInfo.fontStyle;
    fixButtonContainer.onclick = (e) => {
        fixFunction();
        ignoreProperty.set(false);
        disableUI();
        e.stopPropagation();
    };

    fixButtonContainer.appendChild(fixButtonDiv);

    buttonRow.appendChild(ignoreButtonContainer);
    buttonRow.appendChild(fixButtonContainer);

    errorContainer.appendChild(buttonRow);
    errorLayout.appendChild(errorContainer);
    warningDiv.appendChild(errorLayout);
}

/**
 * Clear the "Cards by" warning
 */
export function clearWarning(modDiv: HTMLDivElement) {
    // get warning div
    var warningDiv = document.getElementById("warning-message") as HTMLDivElement;
    warningDiv.style.display = "none";
    modDiv.style.display = "block";
}
