export type ResponsiveMode = "desktop" | "tablet" | "mobile";
export type DeviceVisibility = {
  desktop: boolean;
  tablet: boolean;
  mobile: boolean;
};

export type ResponsiveOverrideMap = {
  desktop?: Record<string, any> | null;
  tablet?: Record<string, any> | null;
  mobile?: Record<string, any> | null;
};

export type LegacyResponsiveKeys = {
  tablet?: string;
  mobile?: string;
};

function isObject(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasOwnKeys(value: unknown) {
  return isObject(value) && Object.keys(value).length > 0;
}

function shouldClearValue(value: unknown) {
  if (value === null || typeof value === "undefined") return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  if (isObject(value)) return Object.keys(value).length === 0;
  return false;
}

function cloneValue<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => cloneValue(item)) as T;
  }
  if (isObject(value)) {
    const next: Record<string, any> = {};
    Object.entries(value).forEach(([key, item]) => {
      next[key] = cloneValue(item);
    });
    return next as T;
  }
  return value;
}

export function normalizeResponsiveMap(value: unknown): ResponsiveOverrideMap {
  if (isObject(value)) {
    return {
      desktop: isObject(value.desktop) ? { ...value.desktop } : null,
      tablet: isObject(value.tablet) ? { ...value.tablet } : null,
      mobile: isObject(value.mobile) ? { ...value.mobile } : null,
    };
  }
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return normalizeResponsiveMap(parsed);
    } catch {
      return {};
    }
  }
  return {};
}

export function serializeResponsiveMap(value: unknown): string | null {
  const normalized = normalizeResponsiveMap(value);
  const hasDesktop = Boolean(normalized.desktop && Object.keys(normalized.desktop).length);
  const hasTablet = Boolean(normalized.tablet && Object.keys(normalized.tablet).length);
  const hasMobile = Boolean(normalized.mobile && Object.keys(normalized.mobile).length);
  if (!hasDesktop && !hasTablet && !hasMobile) return null;
  return JSON.stringify({
    desktop: hasDesktop ? normalized.desktop : undefined,
    tablet: hasTablet ? normalized.tablet : undefined,
    mobile: hasMobile ? normalized.mobile : undefined,
  });
}

function normalizeResponsiveContainer(nextResponsive: ResponsiveOverrideMap) {
  const hasDesktop = hasOwnKeys(nextResponsive.desktop);
  const hasTablet = hasOwnKeys(nextResponsive.tablet);
  const hasMobile = hasOwnKeys(nextResponsive.mobile);
  if (!hasDesktop && !hasTablet && !hasMobile) return null;
  return {
    desktop: hasDesktop ? { ...(nextResponsive.desktop as Record<string, any>) } : null,
    tablet: hasTablet ? { ...(nextResponsive.tablet as Record<string, any>) } : null,
    mobile: hasMobile ? { ...(nextResponsive.mobile as Record<string, any>) } : null,
  } satisfies ResponsiveOverrideMap;
}

export function getBpAttrs(
  attrs: Record<string, any> | null | undefined,
  mode: ResponsiveMode
): Record<string, any> {
  const safeAttrs = attrs || {};
  const responsive = normalizeResponsiveMap(safeAttrs.responsive);
  const desktopBucket = responsive.desktop || {};
  const tabletBucket = responsive.tablet || {};
  const mobileBucket = responsive.mobile || {};
  const merged: Record<string, any> = { ...safeAttrs, ...desktopBucket };
  if (mode === "tablet" || mode === "mobile") {
    Object.assign(merged, tabletBucket);
  }
  if (mode === "mobile") {
    Object.assign(merged, mobileBucket);
  }
  return cloneValue(merged);
}

export function resolveAttrs(
  attrs: Record<string, any> | null | undefined,
  mode: ResponsiveMode
) {
  return getBpAttrs(attrs, mode);
}

export function resolveModeAttrs(
  attrs: Record<string, any> | null | undefined,
  mode: ResponsiveMode
) {
  return getBpAttrs(attrs, mode);
}

export function setBpAttrs(
  attrs: Record<string, any> | null | undefined,
  mode: ResponsiveMode,
  patch: Record<string, any>,
  options?: {
    legacyMap?: Record<string, LegacyResponsiveKeys>;
  }
) {
  const safeAttrs = attrs || {};
  const responsive = normalizeResponsiveMap(safeAttrs.responsive);

  if (mode === "desktop") {
    const next: Record<string, any> = { ...safeAttrs };
    const desktopBucket = { ...(responsive.desktop || {}) };
    for (const [key, value] of Object.entries(patch)) {
      if (shouldClearValue(value)) {
        delete next[key];
      } else {
        next[key] = cloneValue(value);
      }
      // Keep desktop source of truth in base attrs.
      delete desktopBucket[key];
    }
    const nextResponsive = normalizeResponsiveContainer({
      ...responsive,
      desktop: Object.keys(desktopBucket).length ? desktopBucket : null,
    });
    next.responsive = nextResponsive;
    return next;
  }

  const next: Record<string, any> = { ...safeAttrs };
  const targetBucket = { ...(responsive[mode] || {}) };
  const debugBeforeBase = process.env.DEBUG_EDITOR_RESPONSIVE === "1" ? { ...safeAttrs } : null;
  for (const [key, value] of Object.entries(patch)) {
    if (shouldClearValue(value)) {
      delete targetBucket[key];
    } else {
      targetBucket[key] = cloneValue(value);
    }
    const legacy = options?.legacyMap?.[key];
    if (legacy?.tablet && mode === "tablet") {
      next[legacy.tablet] = shouldClearValue(value) ? null : cloneValue(value);
    }
    if (legacy?.mobile && mode === "mobile") {
      next[legacy.mobile] = shouldClearValue(value) ? null : cloneValue(value);
    }
  }

  const nextResponsive = normalizeResponsiveContainer({
    ...responsive,
    [mode]: Object.keys(targetBucket).length ? targetBucket : null,
  });
  next.responsive = nextResponsive;

  if (debugBeforeBase) {
    const leakedDesktopKeys = Object.keys(patch).filter((key) => {
      const before = debugBeforeBase[key];
      const after = next[key];
      return JSON.stringify(before) !== JSON.stringify(after);
    });
    if (leakedDesktopKeys.length > 0) {
      console.warn("[editor-responsive] desktop leak detected", {
        mode,
        leakedDesktopKeys,
      });
    }
  }

  return next;
}

export function setModeAttrs(
  attrs: Record<string, any> | null | undefined,
  mode: ResponsiveMode,
  patch: Record<string, any>,
  options?: {
    legacyMap?: Record<string, LegacyResponsiveKeys>;
  }
) {
  return setBpAttrs(attrs, mode, patch, options);
}

export function setModeOverride(
  attrs: Record<string, any> | null | undefined,
  mode: ResponsiveMode,
  patch: Record<string, any>,
  options?: {
    legacyMap?: Record<string, LegacyResponsiveKeys>;
  }
) {
  return setBpAttrs(attrs, mode, patch, options);
}

export function inheritDesktopToBp(
  attrs: Record<string, any> | null | undefined,
  mode: Exclude<ResponsiveMode, "desktop">,
  keys: string[],
  options?: {
    legacyMap?: Record<string, LegacyResponsiveKeys>;
  }
) {
  const desktopSnapshot = getBpAttrs(attrs, "desktop");
  const patch: Record<string, any> = {};
  for (const key of keys) {
    patch[key] = desktopSnapshot[key];
  }
  return setBpAttrs(attrs, mode, patch, options);
}

export function inheritDesktop(
  attrs: Record<string, any> | null | undefined,
  mode: Exclude<ResponsiveMode, "desktop">,
  keys: string[],
  options?: {
    legacyMap?: Record<string, LegacyResponsiveKeys>;
  }
) {
  return inheritDesktopToBp(attrs, mode, keys, options);
}

export function inheritDesktopToMode(
  attrs: Record<string, any> | null | undefined,
  mode: Exclude<ResponsiveMode, "desktop">,
  keys: string[],
  options?: {
    legacyMap?: Record<string, LegacyResponsiveKeys>;
  }
) {
  return inheritDesktopToBp(attrs, mode, keys, options);
}

export function clearModeAttrs(
  attrs: Record<string, any> | null | undefined,
  mode: ResponsiveMode,
  keys: string[],
  options?: {
    legacyMap?: Record<string, LegacyResponsiveKeys>;
  }
) {
  const patch = keys.reduce<Record<string, any>>((acc, key) => {
    acc[key] = undefined;
    return acc;
  }, {});
  return setBpAttrs(attrs, mode, patch, options);
}

export function clearModeOverride(
  attrs: Record<string, any> | null | undefined,
  mode: Exclude<ResponsiveMode, "desktop">,
  options?: {
    legacyMap?: Record<string, LegacyResponsiveKeys>;
  }
) {
  const safeAttrs: Record<string, any> = { ...(attrs || {}) };
  const responsive = normalizeResponsiveMap(safeAttrs.responsive);
  const nextResponsive = normalizeResponsiveContainer({
    ...responsive,
    [mode]: null,
  });
  safeAttrs.responsive = nextResponsive;

  if (options?.legacyMap) {
    for (const legacy of Object.values(options.legacyMap)) {
      if (mode === "tablet" && legacy.tablet) {
        safeAttrs[legacy.tablet] = null;
      }
      if (mode === "mobile" && legacy.mobile) {
        safeAttrs[legacy.mobile] = null;
      }
    }
  }

  return safeAttrs;
}

export function getResponsiveValue(
  attrs: Record<string, any> | null | undefined,
  key: string,
  mode: ResponsiveMode,
  legacyKeys?: LegacyResponsiveKeys
) {
  const safeAttrs = attrs || {};
  const resolved = getBpAttrs(safeAttrs, mode);
  const tabletLegacy = legacyKeys?.tablet ? safeAttrs[legacyKeys.tablet] : undefined;
  const mobileLegacy = legacyKeys?.mobile ? safeAttrs[legacyKeys.mobile] : undefined;
  const resolvedValue = resolved[key];

  if (typeof resolvedValue !== "undefined") return resolvedValue;
  if (mode === "desktop") return safeAttrs[key];
  if (mode === "tablet") return tabletLegacy ?? safeAttrs[key];
  return mobileLegacy ?? tabletLegacy ?? safeAttrs[key];
}

export function clearResponsiveValue(
  attrs: Record<string, any> | null | undefined,
  key: string,
  mode: Exclude<ResponsiveMode, "desktop">,
  legacyKeys?: LegacyResponsiveKeys
) {
  const safeAttrs = attrs || {};
  const legacyMap = legacyKeys ? { [key]: legacyKeys } : undefined;
  return setBpAttrs(safeAttrs, mode, { [key]: undefined }, { legacyMap });
}

export function setResponsiveValue(
  attrs: Record<string, any> | null | undefined,
  key: string,
  value: any,
  mode: ResponsiveMode,
  legacyKeys?: LegacyResponsiveKeys
) {
  const safeAttrs = attrs || {};
  const legacyMap = legacyKeys ? { [key]: legacyKeys } : undefined;
  return setBpAttrs(safeAttrs, mode, { [key]: value }, { legacyMap });
}

export function setResponsivePatch(
  attrs: Record<string, any> | null | undefined,
  patch: Record<string, any>,
  mode: ResponsiveMode,
  legacyMap?: Record<string, LegacyResponsiveKeys>
) {
  let next = { ...(attrs || {}) };
  for (const [key, value] of Object.entries(patch)) {
    next = setResponsiveValue(next, key, value, mode, legacyMap?.[key]);
  }
  return next;
}

export function clearResponsivePatch(
  attrs: Record<string, any> | null | undefined,
  keys: string[],
  mode: Exclude<ResponsiveMode, "desktop">,
  legacyMap?: Record<string, LegacyResponsiveKeys>
) {
  let next = { ...(attrs || {}) };
  for (const key of keys) {
    next = clearResponsiveValue(next, key, mode, legacyMap?.[key]);
  }
  return next;
}

function toVisibility(value: unknown, fallback = true) {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

export function resolveDeviceVisibility(attrs: Record<string, any> | null | undefined): DeviceVisibility {
  const safeAttrs = attrs || {};
  const visibilityMap = isObject(safeAttrs.visibility) ? safeAttrs.visibility : null;
  return {
    desktop: toVisibility(safeAttrs.visibleDesktop ?? visibilityMap?.desktop, true),
    tablet: toVisibility(safeAttrs.visibleTablet ?? visibilityMap?.tablet, true),
    mobile: toVisibility(safeAttrs.visibleMobile ?? visibilityMap?.mobile, true),
  };
}

export function getVisibilityForMode(
  attrs: Record<string, any> | null | undefined,
  mode: ResponsiveMode
) {
  return resolveDeviceVisibility(attrs)[mode];
}

export function setDeviceVisibility(
  attrs: Record<string, any> | null | undefined,
  patch: Partial<DeviceVisibility>
) {
  const safeAttrs = attrs || {};
  return {
    ...safeAttrs,
    visibleDesktop:
      typeof patch.desktop === "boolean"
        ? patch.desktop
        : toVisibility(safeAttrs.visibleDesktop, true),
    visibleTablet:
      typeof patch.tablet === "boolean"
        ? patch.tablet
        : toVisibility(safeAttrs.visibleTablet, true),
    visibleMobile:
      typeof patch.mobile === "boolean"
        ? patch.mobile
        : toVisibility(safeAttrs.visibleMobile, true),
  };
}

export function visibilityDataAttrs(
  attrs: Record<string, any> | null | undefined
) {
  const visibility = resolveDeviceVisibility(attrs);
  return {
    "data-visible-desktop": visibility.desktop ? "true" : "false",
    "data-visible-tablet": visibility.tablet ? "true" : "false",
    "data-visible-mobile": visibility.mobile ? "true" : "false",
  } as const;
}
