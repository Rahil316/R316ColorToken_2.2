// GLOBAL VARIABLE TO TRACK CURRENT EDITABLE SCHEME
window.currentEditableScheme = null;

// UTILITY FUNCTIONS
function getOptimalTextColor(bg) {
  const b = normalizeHex(bg) || "#000000";
  return contrastRatio(b, "#000000") > contrastRatio(b, "#FFFFFF")
    ? "black"
    : "white";
}

// DISPLAY FUNCTIONS
function displayColorTokens(collection) {
  const container = document.getElementById("rawColorsContainer");
  if (!container) return;

  container.classList.add("color-system-updating");
  const fragment = document.createDocumentFragment();

  if (collection.errors)
    fragment.appendChild(createErrorSection(collection.errors));
  fragment.appendChild(createRawSection(collection.raw));
  fragment.appendChild(createThemeSection(collection.ctx, "light"));
  fragment.appendChild(createThemeSection(collection.ctx, "dark"));

  container.innerHTML = "";
  container.appendChild(fragment);

  requestAnimationFrame(() => {
    container.classList.remove("color-system-updating");
  });
}

function createErrorSection(errors) {
  const createListHTML = (arr) =>
    arr
      .map(
        (e) =>
          `<div class="error-item">${e.error || e.warning || e.notice}</div>`
      )
      .join("");

  const section = document.createElement("div");
  section.className = "errors-section";
  section.innerHTML = `
    <div class="errors-header">
      <h4 class="errors-header__title">⚠️ Warnings & Errors</h4>
      <button class="errors-toggle collapsed">-></button>
    </div>
    <div class="errors-content custom-scrollbar">
      <div class="error-category">
        <div class="error-category__title">Critical (${
          errors.critical?.length || 0
        })</div>
        ${createListHTML(errors.critical || [])}
      </div>
      <div class="error-category">
        <div class="error-category__title">Warnings (${
          errors.warnings?.length || 0
        })</div>
        ${createListHTML(errors.warnings || [])}
      </div>
      <div class="error-category">
        <div class="error-category__title">Notices (${
          errors.notices?.length || 0
        })</div>
        ${createListHTML(errors.notices || [])}
      </div>
    </div>
  `;

  const header = section.querySelector(".errors-header");
  const content = section.querySelector(".errors-content");
  const toggle = section.querySelector(".errors-toggle");

  header.addEventListener("click", () => {
    const isCollapsed = toggle.classList.contains("collapsed");
    toggle.classList.toggle("collapsed", !isCollapsed);
    content.classList.toggle("expanded", isCollapsed);
  });

  return section;
}

function createRawSection(raw) {
  const rawHTML = Object.entries(raw)
    .map(([colorGroup, weights]) => {
      const swatchesHTML = Object.entries(weights)
        .map(([weight, data]) => {
          if (!data?.value) return "";
          const colorValue = normalizeHex(data.value) || "#000000";
          const textColor = getOptimalTextColor(colorValue);
          return `
          <div class="color-swatch" style="background-color:${colorValue}; color:${textColor}">
            <div class="swatch-info">
              <div class="swatch-weight">
                <span>${weight}</span>
                <span>${data.tknName}</span>
              </div>
              <div class="swatch-hex">
                <span>${colorValue}</span>
                <span>HSL: ${hexToHsl(colorValue)}</span>
              </div>
              <div class="swatch-contrast">
                <span class="contrast-label">Light</span>
                <span>${(data.contrast.light.ratio || 0).toFixed(2)} - ${
            data.contrast.light.rating
          }</span>
              </div>
              <div class="swatch-contrast">
                <span class="contrast-label">Dark</span>
                <span>${(data.contrast.dark.ratio || 0).toFixed(2)} - ${
            data.contrast.dark.rating
          }</span>
              </div>
            </div>
          </div>
        `;
        })
        .join("");

      return `
        <div class="color-group">
          <h3 class="color-group__title">${colorGroup.toUpperCase()}</h3>
          <div class="swatches-grid">${swatchesHTML}</div>
        </div>
      `;
    })
    .join("");

  const section = document.createElement("div");
  section.className = "raw-colors-section";
  section.innerHTML = `
    <h4 class="raw-colors-section__title">Raw Color Palette</h4>
    ${rawHTML}
  `;

  return section;
}

function createThemeSection(con, theme) {
  const themeData = con[theme];
  const themeName = theme.charAt(0).toUpperCase() + theme.slice(1);

  const contextualHTML = Object.entries(themeData)
    .map(([colorGroup, roles]) => {
      if (!roles || Object.keys(roles).length === 0) {
        return `
          <div class="contextual-group">
            <h4 class="contextual-group__title">${colorGroup}</h4>
            <p>No roles generated</p>
          </div>
        `;
      }

      const rolesHTML = Object.entries(roles)
        .map(([role, variations]) => {
          if (!variations || Object.keys(variations).length === 0) return "";

          const variationsHTML = Object.entries(variations)
            .map(([variation, data]) => {
              if (!data?.value) return "";
              const colorValue = normalizeHex(data.value) || "#000000";
              const textColor = getOptimalTextColor(colorValue);

              return `
                <div class="color-token" style="background-color:${colorValue}; color:${textColor}">
                  <div class="token-info">
                    <div class="token-variation">${variation}</div>
                    <div class="token-hex">${colorValue}</div>
                    <div class="token-ref">Ref: ${data.valueRef}</div>
                    <div class="token-contrast">
                      Contrast: ${(data.contrastRatio || 0).toFixed(2)} - ${
                data.contrastRating
              }
                    </div>
                    ${
                      data.isAdjusted
                        ? '<div class="token-adjustment">Adjusted</div>'
                        : ""
                    }
                    <div class="token-theme">${themeName} Theme</div>
                  </div>
                </div>
              `;
            })
            .join("");

          return variationsHTML
            ? `
              <div class="role-group">
                <h5 class="role-group-dark__title">${role}</h5>
                <div class="variations-grid">${variationsHTML}</div>
              </div>
            `
            : "";
        })
        .join("");
      let className =
        theme === "dark" ? "contextual-group-dark" : "contextual-group";

      return rolesHTML
        ? `
          <div class="${className}">
            <h4 class="${className}__title">${colorGroup.toUpperCase()}</h4>
            ${rolesHTML}
          </div>
        `
        : "";
    })
    .join("");

  const section = document.createElement("div");
  section.className = `theme-section ${theme}-theme`;
  section.innerHTML = `
    <h4 class="raw-colors-section__title">${themeName} Theme - Contextual Tokens</h4>
    ${contextualHTML}
  `;

  return section;
}

// function createDebugSection(collection) {
//   const { raw, ctx, errors } = collection;
//   const section = document.createElement("div");
//   section.className = "debug-section";
//   section.innerHTML = `
//     <div class="action-buttons">
//       <button id="exportCss" class="btn btn--primary">Export CSS</button>
//       <button id="downloadCsv" class="btn btn--primary">Export CSV</button>
//     </div>
//   `;
//   return section;
// }

// CONTROL PANEL FUNCTIONS
function createColorInputs(colorScheme, onUpdate) {
  const targetContainer = document.getElementById("colorInputs");
  if (!targetContainer) return;

  // Clear container
  targetContainer.innerHTML = "";

  // ----- Basic Settings -----
  const basicSection = createSection("Basic Settings");
  basicSection.className = "color-group-control";
  basicSection.appendChild(
    createInput("name", "System Name", colorScheme.name)
  );
  basicSection.appendChild(
    createInput(
      "weightCount",
      "Weight Count",
      colorScheme.weightCount,
      "number"
    )
  );
  // ----- Background Colors -----
  basicSection.appendChild(
    createColorInput(
      "lightBg",
      "Light Theme Background",
      colorScheme.lightBg || "FFFFFF"
    )
  );
  basicSection.appendChild(
    createColorInput(
      "darkBg",
      "Dark Theme Background",
      colorScheme.darkBg || "000000"
    )
  );
  targetContainer.appendChild(basicSection);

  // ----- Color Groups -----
  targetContainer.appendChild(createColorGroupsSection(colorScheme));

  // ----- Roles -----
  targetContainer.appendChild(createRolesSection(colorScheme));

  // ----- INPUT HANDLERS -----
  let updateTimeout;
  const inputs = targetContainer.querySelectorAll("input");

  inputs.forEach((input) => {
    input.addEventListener("input", (e) => {
      const path = e.target.dataset.path.split(".");
      const rawVal = e.target.value;
      const type = e.target.type;

      if (updateTimeout) clearTimeout(updateTimeout);

      updateTimeout = setTimeout(() => {
        // Hex text fields
        if (type === "text" && e.target.classList.contains("color-text")) {
          const normalized = normalizeHex(rawVal);
          if (!normalized) return; // don't commit until valid
          updateColorScheme(colorScheme, path, normalized.replace("#", ""));
        }

        // Numeric fields (gaps, weightCount, minContrast)
        else if (type === "number") {
          const n = rawVal === "" ? 0 : Number(rawVal);
          updateColorScheme(
            colorScheme,
            path,
            Number.isFinite(n) ? Math.floor(n) : 0
          );
        }

        // Everything else
        else {
          updateColorScheme(colorScheme, path, rawVal);
        }

        const updatedCopy = JSON.parse(JSON.stringify(colorScheme));
        window.currentEditableScheme = updatedCopy; // Update global
        onUpdate(updatedCopy);
      }, 350);
    });

    input.addEventListener("change", (e) => {
      const path = e.target.dataset.path.split(".");
      const rawVal = e.target.value;
      const type = e.target.type;

      if (type === "number") {
        const n = rawVal === "" ? 0 : Number(rawVal);
        updateColorScheme(
          colorScheme,
          path,
          Number.isFinite(n) ? Math.floor(n) : 0
        );
      } else {
        updateColorScheme(colorScheme, path, rawVal.replace("#", ""));
      }

      const updatedCopy = JSON.parse(JSON.stringify(colorScheme));
      window.currentEditableScheme = updatedCopy; // Update global
      onUpdate(updatedCopy);
    });
  });
}

function createColorGroupsSection(colorScheme) {
  const colorsSection = createSection("Color Groups");

  // Create add button
  const addButton = document.createElement("button");
  addButton.className = "add-color-group-btn";
  addButton.textContent = "+ Add";
  addButton.addEventListener("click", () => {
    const newGroup = {
      name: `color${colorScheme.clrGroups.length + 1}`,
      shortName: `C${colorScheme.clrGroups.length + 1}`,
      value: "000000",
    };
    colorScheme.clrGroups.unshift(newGroup);
    // Recreate the entire controls section
    createColorInputs(colorScheme, (updated) => {
      window.currentEditableScheme = updated; // Update global
      const output = variableMaker(updated);
      displayColorTokens(output);
    });
  });
  colorsSection.appendChild(addButton);

  // Create existing color groups
  colorScheme.clrGroups.forEach((group, index) => {
    colorsSection.appendChild(createColorGroupInput(group, index));
  });

  return colorsSection;
}

function createColorGroupInput(group, index) {
  const div = document.createElement("div");
  div.className = "color-group-control";

  const formattedLabel =
    group.name.charAt(0).toUpperCase() + group.name.slice(1);

  div.innerHTML = `
    <div class="color-group-header">
      <h4 class="color-group-header__title">${formattedLabel}</h4>
      <button class="delete-group-btn" data-index="${index}">×</button>
    </div>
    <div class="input-group">
      <label class="input-group__label">Name</label>
      <input type="text" class="input-group__control" value="${group.name}" data-path="clrGroups.${index}.name">
    </div>
    <div class="input-group">
      <label class="input-group__label">Short Name</label>
      <input type="text" class="input-group__control" value="${group.shortName}" data-path="clrGroups.${index}.shortName">
    </div>
    <div class="input-group color-input">
      <label class="input-group__label">Color Value</label>
      <div class="color-input-wrapper">
        <input type="color" value="#${group.value}" data-path="clrGroups.${index}.value" class="input-group__control color-picker">
        <input type="text" value="${group.value}" data-path="clrGroups.${index}.value" class="input-group__control color-text" placeholder="Hex color">
      </div>
    </div>
  `;

  setupColorInputSync(div);

  // Add delete button handler
  const deleteBtn = div.querySelector(".delete-group-btn");
  if (deleteBtn) {
    deleteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const index = parseInt(e.target.dataset.index);

      // Remove the group from the color scheme
      colorScheme.clrGroups.splice(index, 1);

      // Recreate the entire controls section
      createColorInputs(colorScheme, (updated) => {
        window.currentEditableScheme = updated; // Update global
        const output = variableMaker(updated);
        displayColorTokens(output);
      });
    });
  }

  return div;
}

function createColorInput(path, label, value) {
  const div = document.createElement("div");
  div.className = "input-group color-input";
  div.innerHTML = `
    <label class="input-group__label">${label}</label>
    <div class="color-input-wrapper">
      <input type="color" value="#${value}" data-path="${path}" class="input-group__control color-picker">
      <input type="text" value="${value}" data-path="${path}" class="input-group__control color-text" placeholder="${label}">
    </div>
  `;
  setupColorInputSync(div);
  return div;
}

function setupColorInputSync(container) {
  const colorPicker = container.querySelector(".color-picker");
  const colorText = container.querySelector(".color-text");

  colorPicker.addEventListener("input", (e) => {
    const hexValue = e.target.value.replace("#", "");
    colorText.value = hexValue.toUpperCase();
  });

  colorText.addEventListener("input", (e) => {
    let hexValue = e.target.value.replace("#", "").toUpperCase();
    if (/^[0-9A-F]{6}$/.test(hexValue)) {
      colorPicker.value = "#" + hexValue;
    }
  });
}

function createRolesSection(colorScheme) {
  const rolesSection = createSection("Roles Configuration");

  for (const [roleKey, role] of Object.entries(colorScheme.roles)) {
    const roleDiv = document.createElement("div");
    const roleInputs = document.createElement("div");

    roleInputs.className = "role-inputs-group";
    roleDiv.className = "role-control-group";

    roleDiv.innerHTML = `<h4 class="role-control-group__title">${role.name}</h4>`;

    // Min contrast input
    roleInputs.appendChild(
      createInput(
        `roles.${roleKey}.minContrast`,
        "Min Contrast",
        role.minContrast,
        "number"
      )
    );

    // Gaps input
    roleInputs.appendChild(
      createInput(`roles.${roleKey}.gaps`, "Gaps", role.gaps, "number")
    );

    // Short name input
    roleInputs.appendChild(
      createInput(`roles.${roleKey}.shortName`, "Short Name", role.shortName)
    );

    roleDiv.appendChild(roleInputs);
    rolesSection.appendChild(roleDiv);
  }

  return rolesSection;
}

function createSection(title) {
  const section = document.createElement("div");
  section.className = "control-section";
  section.innerHTML = `<h4 class="control-section__title">${title}</h4>`;
  return section;
}

function createInput(path, label, value, type = "text") {
  const div = document.createElement("div");
  div.className = "input-group";
  div.innerHTML = `
    <label class="input-group__label">${label}</label>
    <input type="${type}" class="input-group__control" value="${value}" data-path="${path}">
  `;
  return div;
}

function updateColorScheme(colorScheme, path, value) {
  // Handle backgrounds (strip #)
  if (path[0] === "lightBg" || path[0] === "darkBg") {
    colorScheme[path[0]] = value.replace("#", "");
    return;
  }

  // Handle color groups array
  if (path[0] === "clrGroups" && path[1] !== undefined) {
    const index = parseInt(path[1]);
    if (!isNaN(index) && colorScheme.clrGroups[index]) {
      const property = path[2];
      if (property === "value") {
        colorScheme.clrGroups[index][property] = value.replace("#", "");
      } else {
        colorScheme.clrGroups[index][property] = value;
      }
    }
    return;
  }

  // Walk nested object for other properties
  let current = colorScheme;
  for (let i = 0; i < path.length - 1; i++) {
    current = current[path[i]];
  }

  const key = path[path.length - 1];

  // Numeric fields
  if (key === "gaps" || key === "minContrast" || key === "weightCount") {
    const n = value === "" ? 0 : Number(value);
    current[key] = Number.isFinite(n) ? n : 0;
    return;
  }

  // Everything else stored raw
  current[key] = value;
}

// CONFIG IMPORT/EXPORT FUNCTIONS
function exportColorScheme(colorScheme) {
  const dataStr = JSON.stringify(colorScheme, null, 2);
  const dataUri =
    "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);

  const exportFileDefaultName = `color-scheme-${
    colorScheme.name || "untitled"
  }-${new Date().toISOString().slice(0, 10)}.json`;

  const linkElement = document.createElement("a");
  linkElement.setAttribute("href", dataUri);
  linkElement.setAttribute("download", exportFileDefaultName);
  linkElement.click();
}

function importColorScheme(event, onImportSuccess) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const importedScheme = JSON.parse(e.target.result);

      // Validate basic structure
      if (
        !importedScheme ||
        !importedScheme.clrGroups ||
        !Array.isArray(importedScheme.clrGroups) ||
        !importedScheme.roles
      ) {
        alert("Invalid color scheme file format");
        return;
      }

      onImportSuccess(importedScheme);

      // Clear the file input
      event.target.value = "";
    } catch (error) {
      console.error("Error parsing color scheme:", error);
      alert("Error parsing color scheme file. Please check the format.");
    }
  };

  reader.readAsText(file);
}

function createImportExportControls() {
  // Find the Basic Settings section
  const basicSettingsSection = document.querySelector(".main-header");

  if (!basicSettingsSection) {
    console.error("Could not find Basic Settings section");
    return;
  }

  // Check if import/export controls already exist
  const existingControls = basicSettingsSection.querySelector(
    ".import-export-controls"
  );
  if (existingControls) {
    existingControls.remove();
  }

  // Create import/export controls
  const importExportDiv = document.createElement("div");
  importExportDiv.className = "import-export-controls";
  importExportDiv.innerHTML = `
        <div class="import-export-buttons">
        <button id="exportCss" class="btn btn--primary">Export CSS</button>
        <button id="downloadCsv" class="btn btn--primary">Export CSV</button>
        <button id="exportConfig" class="btn btn--primary">Export Config</button>
            <label for="importConfig" class="btn btn--primary">
              Import Config
              <input type="file" id="importConfig" accept=".json" style="display: none" />
            </label>
          </div>
  `;

  // Append to the Basic Settings section
  basicSettingsSection.appendChild(importExportDiv);

  // Set up event listeners
  const exportBtn = importExportDiv.querySelector("#exportConfig");
  const importInput = importExportDiv.querySelector("#importConfig");

  if (exportBtn) {
    exportBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      exportColorScheme(window.currentEditableScheme || colorScheme);
    });
  }

  if (importInput) {
    importInput.addEventListener("change", (e) => {
      importColorScheme(e, (importedScheme) => {
        // Update the global colorScheme with imported data
        Object.assign(colorScheme, importedScheme);

        // Update the current editable scheme
        window.currentEditableScheme = JSON.parse(JSON.stringify(colorScheme));

        // Reinitialize the UI with imported scheme
        initializeColorControls();
      });
    });
  }
}

// INITIALIZATION
function initializeColorControls() {
  console.log("Initializing color controls...");

  // Always work on a deep copy so UI changes do not mutate the original
  const editable = JSON.parse(JSON.stringify(colorScheme));
  window.currentEditableScheme = editable; // Set global variable

  // Build all UI inputs + wire input handlers
  createColorInputs(editable, (updatedScheme) => {
    window.currentEditableScheme = updatedScheme; // Update global
    const output = variableMaker(updatedScheme);
    displayColorTokens(output);
  });

  // Add import/export controls
  setTimeout(() => {
    createImportExportControls();
  }, 50);

  // Render initial output
  displayColorTokens(variableMaker(editable));

  // Event delegation for all buttons
  document.addEventListener("click", (e) => {
    if (e.target.id === "exportCss") {
      downloadCss(); // This function is in DocGen.js
    }

    if (e.target.id === "exportConfig") {
      exportColorScheme(window.currentEditableScheme || colorScheme);
    }

    if (e.target.id === "downloadCsv") {
      // Use current editable scheme for CSV export
      const currentScheme = window.currentEditableScheme || editable;
      const updated = variableMaker(currentScheme);

      console.log("CSV export - variableMaker output structure:", updated);

      // Handle the structure properly for flattenTokensForCsv
      let dataForCsv = updated;

      // Check if we need to adjust the structure
      // flattenTokensForCsv expects an object with .con property containing light/dark themes
      if (updated && !updated.con) {
        // If no .con property, check for other possible structures
        if (updated.ctx) {
          // If it has .ctx, that might be what we need
          if (updated.ctx.light && updated.ctx.dark) {
            // Wrap .ctx in a .con property
            dataForCsv = { con: updated.ctx };
          } else if (updated.ctx.con) {
            // If .ctx has .con, use that
            dataForCsv = updated.ctx;
          }
        } else if (updated.light && updated.dark) {
          // If light/dark are at root level, wrap them
          dataForCsv = { con: { light: updated.light, dark: updated.dark } };
        }
      }

      console.log("Data being passed to flattenTokensForCsv:", dataForCsv);

      const flat = flattenTokensForCsv(dataForCsv);
      console.log("Flattened CSV data:", flat);

      if (flat.length === 0) {
        console.warn("No data found for CSV export");
        alert(
          "No color token data found to export. Please check if the color system is properly configured."
        );
        return;
      }

      const csv = generateCSV({
        data: flat,
        columns: [
          { label: "Theme", path: "theme" },
          { label: "Group", path: "group" },
          { label: "Role", path: "role" },
          { label: "Variation", path: "variation" },
          { label: "Weight", path: "weight" },
          { label: "Hex Value", path: "value" },
          { label: "Contrast Ratio", path: "contrastRatio" },
          { label: "Rating", path: "contrastRating" },
        ],
      });

      downloadCSV("tokens.csv", csv);
    }
  });
}

// Export for module use if needed
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    displayColorTokens,
    createColorInputs,
    initializeColorControls,
    exportColorScheme,
    importColorScheme,
  };
}
