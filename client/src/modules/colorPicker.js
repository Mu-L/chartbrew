import { parseColor } from "@heroui/react";

const TRANSPARENT_COLOR_VALUES = new Set(["transparent", "rgba(0,0,0,0)", "rgba(0, 0, 0, 0)"]);

function getSafeFallback(fallback) {
  return typeof fallback === "string" && fallback.trim() ? fallback : "#000000";
}

export function normalizeColorForPicker(color, fallback = "#000000") {
  if (color && typeof color === "object" && typeof color.toString === "function") {
    return color;
  }

  const safeFallback = getSafeFallback(fallback);

  if (typeof color !== "string") {
    return parseColor(safeFallback);
  }

  const trimmedColor = color.trim();
  if (!trimmedColor || TRANSPARENT_COLOR_VALUES.has(trimmedColor.toLowerCase())) {
    return parseColor(safeFallback);
  }

  try {
    return parseColor(trimmedColor);
  } catch (error) {
    return parseColor(safeFallback);
  }
}

export function getRgbColorChannels(color, fallback = "#000000") {
  const rgbColor = normalizeColorForPicker(color, fallback).toFormat("rgb");
  const red = Math.round(rgbColor.getChannelValue("red"));
  const green = Math.round(rgbColor.getChannelValue("green"));
  const blue = Math.round(rgbColor.getChannelValue("blue"));
  const alphaChannel = rgbColor.getChannelValue("alpha");
  const alpha = Number((typeof alphaChannel === "number" ? alphaChannel : 1).toFixed(3));

  return {
    red,
    green,
    blue,
    alpha,
    r: red,
    g: green,
    b: blue,
    a: alpha,
  };
}

export function serializeColorForPicker(color, format = "smart", fallback = "#000000") {
  const { red, green, blue, alpha } = getRgbColorChannels(color, fallback);

  if (format === "rgba") {
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
  }

  const hex = [red, green, blue]
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();

  if (format === "smart" && alpha < 1) {
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
  }

  return `#${hex}`;
}
