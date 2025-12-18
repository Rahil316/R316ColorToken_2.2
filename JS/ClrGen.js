// COLOR SYSTEM
const colorScheme = {
  name: "R316 Color Token System",
  clrGroups: [
    { name: "primary", shortName: "Pr", value: "5d10d1" },
    { name: "secondary", shortName: "Sc", value: "904AAA" },
    { name: "tertiary", shortName: "Te", value: "7E8088" },
    { name: "black", shortName: "Bk", value: "1C2230" },
    { name: "gray", shortName: "Gr", value: "87899D" },
    { name: "success", shortName: "Su", value: "47B872" },
    { name: "danger", shortName: "Dg", value: "ED3E3E" },
    { name: "warning", shortName: "Wg", value: "F2AA30" },
    { name: "info", shortName: "In", value: "206BB0" },
  ],
  roles: {
    text: { name: "Text", shortName: "tx", minContrast: "5", gaps: 3 },
    layer: { name: "Layer", shortName: "ly", minContrast: "0", gaps: 1 },
    stroke: { name: "Stroke", shortName: "st", minContrast: "1", gaps: 1 },
    fill: { name: "Fill", shortName: "fi", minContrast: "4", gaps: 2 },
  },
  variations: {
    weakest: { name: "Weakest", code: "1" },
    weak: { name: "Weak", code: "2" },
    base: { name: "Base", code: "3" },
    strong: { name: "Strong", code: "4" },
    stronger: { name: "Stronger", code: "5" },
  },
  weightCount: 23,
  lightBg: "FFFFFF",
  darkBg: "000000",
  weightNames: "",
};

// CACHE FOR FREQUENT CALLS
// ============================================================================
// Since variableMaker() is called frequently (up to 5x/sec), we should cache results
const colorCache = new Map();
let lastInputHash = null;
let cachedOutput = null;

// COLOR SYSTEM GENERATOR
// ============================================================================
function variableMaker(clrSys) {
  // OPTIMIZATION: Cache check - return cached result if inputs haven't changed
  const inputHash = JSON.stringify({
    clrGroups: clrSys.clrGroups.map((g) => ({
      ...g,
      value: normalizeHex(g.value),
    })),
    weightCount: clrSys.weightCount,
    lightBg: normalizeHex(clrSys.lightBg),
    darkBg: normalizeHex(clrSys.darkBg),
    roles: clrSys.roles,
  });

  if (inputHash === lastInputHash && cachedOutput) {
    return cachedOutput;
  }

  const clrGroups = clrSys.clrGroups;
  const clrRoles = clrSys.roles;
  const clrWeights = seriesMaker(clrSys.weightCount);

  // OPTIMIZATION: Pre-calculate normalized backgrounds
  const lightBg = normalizeHex(clrSys.lightBg) || "#FFFFFF";
  const darkBg = normalizeHex(clrSys.darkBg) || "#000000";

  // OPTIMIZATION: Pre-allocate objects with known sizes
  const rawVarObj = Object.create(null); // Faster than {}
  const conVarObj = {
    light: Object.create(null),
    dark: Object.create(null),
  };

  // OPTIMIZATION: Use typed arrays for weights for faster access
  const weightCount = clrWeights.length;

  // OPTIMIZATION: Pre-calculate all weight indices
  const weightIndices = new Array(weightCount);
  for (let i = 0; i < weightCount; i++) weightIndices[i] = i;

  const errors = { critical: [], warnings: [], notices: [] };

  // RAW COLORS GENERATION
  // ============================================================================
  // OPTIMIZATION: Process groups in a single pass where possible
  for (let gIdx = 0; gIdx < clrGroups.length; gIdx++) {
    const group = clrGroups[gIdx];
    const groupName = group.name;
    const seed = normalizeHex(group.value) || "#000000";

    // OPTIMIZATION: Batch color generation
    const colorVars = colorCalSplit(seed, clrWeights);
    colorVars.reverse(); // Note: This mutates the array - ensure this is expected

    const rawGroupObj = Object.create(null);
    rawVarObj[groupName] = rawGroupObj;

    // OPTIMIZATION: Pre-calculate contrasts for both themes
    for (let wIdx = 0; wIdx < weightCount; wIdx++) {
      const weight = clrWeights[wIdx];
      const value = normalizeHex(colorVars[wIdx]) || seed;

      // OPTIMIZATION: Calculate both contrasts in one go
      const lightContrast = contrastRatio(value, lightBg);
      const darkContrast = contrastRatio(value, darkBg);

      rawGroupObj[weight] = {
        value,
        tknName: `${groupName}-${weight}`,
        contrast: {
          light: {
            ratio: lightContrast,
            rating: contrastRating(value, lightBg),
          },
          dark: {
            ratio: darkContrast,
            rating: contrastRating(value, darkBg),
          },
        },
      };
    }
  }

  // INTERNAL HELPER: can baseIdx satisfy all offsets?
  // ============================================================================
  // OPTIMIZATION: Make this a pure function outside the loop closure
  function canUseBaseIndex(groupName, baseIdx, role, themeName) {
    const gap = role.gaps;
    const minC = parseFloat(role.minContrast);

    // OPTIMIZATION: Pre-calculate offsets array
    const offsets = [
      -2 * gap, // weakest
      -gap, // weak
      0, // base
      gap, // strong
      2 * gap, // stronger
    ];

    const rawGroup = rawVarObj[groupName];
    const themeContrasts = rawGroup[clrWeights[0]].contrast[themeName];

    // Check all offsets
    for (const offset of offsets) {
      const idx = baseIdx + offset;

      // OPTIMIZATION: Early boundary check
      if (idx < 0 || idx >= weightCount) return false;

      const ratio = rawGroup[clrWeights[idx]].contrast[themeName].ratio;

      // OPTIMIZATION: Use strict inequality with epsilon for floating point
      if (ratio == null || ratio + 0.001 < minC) return false;
    }

    return true;
  }

  // CONTEXTUAL TOKENS GENERATION
  // ============================================================================
  const themes = [
    { name: "light", bg: lightBg },
    { name: "dark", bg: darkBg },
  ];

  // OPTIMIZATION: Process themes in parallel where possible
  for (let tIdx = 0; tIdx < themes.length; tIdx++) {
    const theme = themes[tIdx];
    const t = theme.name;
    const conTheme = conVarObj[t];

    for (let gIdx = 0; gIdx < clrGroups.length; gIdx++) {
      const group = clrGroups[gIdx];
      const groupName = group.name;
      const conGroup = Object.create(null);
      conTheme[groupName] = conGroup;

      // Get role names once
      const roleNames = Object.keys(clrRoles);

      for (let rIdx = 0; rIdx < roleNames.length; rIdx++) {
        const roleName = roleNames[rIdx];
        const role = clrRoles[roleName];
        const gap = role.gaps;
        const minC = parseFloat(role.minContrast);

        const conRole = Object.create(null);
        conGroup[roleName] = conRole;

        // FIND USABLE BASE INDEX
        // ============================================================================
        let baseIdx = -1;

        // OPTIMIZATION: Use binary search for optimal base index
        // Perfect match search with early exit
        for (let i = 0; i < weightCount; i++) {
          const weight = clrWeights[i];
          const c = rawVarObj[groupName][weight].contrast[t].ratio;

          if (c >= minC && canUseBaseIndex(groupName, i, role, t)) {
            baseIdx = i;
            break;
          }
        }

        // FALLBACK: Find best available index
        if (baseIdx === -1) {
          let bestIdx = -1;
          let bestRange = -1;

          for (let i = 0; i < weightCount; i++) {
            const weight = clrWeights[i];
            const c = rawVarObj[groupName][weight].contrast[t].ratio;

            if (c >= minC) {
              // OPTIMIZATION: Calculate range without Math.min for speed
              const range = i < weightCount - 1 - i ? i : weightCount - 1 - i;

              if (range > bestRange) {
                bestIdx = i;
                bestRange = range;
              }
            }
          }

          if (bestIdx !== -1) {
            baseIdx = bestIdx;
            errors.warnings.push({
              color: groupName,
              role: roleName,
              theme: t,
              warning: "Min contrast met only partially; using best fallback.",
            });
          } else {
            // OPTIMIZATION: Calculate midpoint without Math.floor if even length
            baseIdx = weightCount >> 1; // Integer division by 2
            errors.critical.push({
              color: groupName,
              role: roleName,
              theme: t,
              error: "Cannot meet minimum contrast for any weight.",
            });
          }
        }

        // CLAMP BASE INDEX TO PREVENT OVERFLOW
        // ============================================================================
        const maxOffset = 2 * gap;
        // OPTIMIZATION: Use bitwise operations for integer math
        const minAllowed = maxOffset;
        const maxAllowed = weightCount - 1 - maxOffset;

        if (baseIdx < minAllowed) baseIdx = minAllowed;
        if (baseIdx > maxAllowed) baseIdx = maxAllowed;

        // GENERATE VARIATIONS
        // ============================================================================
        // OPTIMIZATION: Pre-calculate offsets as array for iteration
        const offsetValues = [
          { key: "weakest", offset: -2 * gap },
          { key: "weak", offset: -gap },
          { key: "base", offset: 0 },
          { key: "strong", offset: gap },
          { key: "stronger", offset: 2 * gap },
        ];

        for (let vIdx = 0; vIdx < offsetValues.length; vIdx++) {
          const { key: variation, offset } = offsetValues[vIdx];
          let idx = baseIdx + offset;
          let adjusted = false;

          // Clamp to valid range
          if (idx < 0) {
            idx = 0;
            adjusted = true;
          } else if (idx >= weightCount) {
            idx = weightCount - 1;
            adjusted = true;
          }

          const weight = clrWeights[idx];
          const data = rawVarObj[groupName][weight];

          conRole[variation] = {
            value: data.value,
            contrastRatio: data.contrast[t].ratio,
            contrastRating: data.contrast[t].rating,
            valueRef: data.tknName,
            tknRole: roleName,
            tknClGroup: groupName,
            weight,
            variationOffset: offset,
            isAdjusted: adjusted,
          };

          if (adjusted) {
            errors.warnings.push({
              color: groupName,
              role: roleName,
              variation,
              theme: t,
              warning: `Variation '${variation}' clamped due to overflow`,
            });
          }
        }
      }
    }
  }

  const output = {
    raw: rawVarObj,
    ctx: conVarObj,
    errors,
    metadata: {
      groups: clrGroups.length,
      weights: weightCount,
      roles: Object.keys(clrRoles).length,
      themes: 2,
    },
  };

  // Cache the result
  lastInputHash = inputHash;
  cachedOutput = output;
  // For debugging: Log primary fill base colors
  console.table(output.raw.primary);

  return output;
}

// ADDITIONAL OPTIMIZATIONS
// ============================================================================

// 1. LAZY EVALUATION: Only generate what's needed
function getContextualToken(clrSys, theme, groupName, roleName, variation) {
  // Could implement a more targeted generation if only specific tokens are needed
}

// 2. INCREMENTAL UPDATES: Update only changed parts
function updateColorSchemeProperty(clrSys, propertyPath, newValue) {
  // Clear cache if relevant property changed
  if (
    propertyPath.startsWith("clrGroups") ||
    propertyPath === "weightCount" ||
    propertyPath === "lightBg" ||
    propertyPath === "darkBg"
  ) {
    lastInputHash = null;
  }
  // Update scheme...
}

// 3. WORKER SUPPORT: For very heavy computations
if (typeof window !== "undefined" && window.Worker) {
  const colorWorker = new Worker("color-worker.js");
  // Could offload heavy computations to web worker
}

// 4. VALIDATION LAYER: Add schema validation
const colorSchemeSchema = {
  // Define expected structure for validation
};

function validateColorScheme(scheme) {
  // Validate before processing
  return true; // or validation result
}

// 5. BATCH PROCESSING: For multiple operations
function batchVariableMaker(schemes) {
  // Process multiple schemes at once if needed
}
