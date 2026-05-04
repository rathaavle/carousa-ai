// ============================================================
// Carousa-AI: Image Text Overlay Utility
// ============================================================
// Renders slide text onto an image using sharp.
// Text is placed at the bottom of the image with a semi-transparent
// dark gradient background for readability.
// ============================================================

import sharp from "sharp";

export interface TextOverlayOptions {
  /** The text to render onto the image. */
  text: string;
  /** Image width in pixels (default: 1024). */
  width?: number;
  /** Image height in pixels (default: 1024). */
  height?: number;
  /** Font size in pixels (default: 42). */
  fontSize?: number;
  /** Text color in hex (default: #ffffff). */
  textColor?: string;
  /** Max characters per line before wrapping (default: 28). */
  maxCharsPerLine?: number;
}

/**
 * Renders text onto an image buffer with a semi-transparent gradient overlay.
 * Text is centered horizontally and placed in the lower third of the image.
 *
 * @param imageBuffer  The source image as a Buffer.
 * @param options      Text and styling options.
 * @returns            The composited image as a PNG Buffer.
 */
export async function applyTextOverlay(
  imageBuffer: Buffer,
  options: TextOverlayOptions,
): Promise<Buffer> {
  const {
    text,
    width = 1024,
    height = 1024,
    fontSize = 42,
    textColor = "#ffffff",
    maxCharsPerLine = 28,
  } = options;

  // Word-wrap the text
  const lines = wrapText(text, maxCharsPerLine);
  const lineHeight = fontSize * 1.4;
  const totalTextHeight = lines.length * lineHeight;
  const paddingV = 40;
  const gradientHeight = Math.round(totalTextHeight + paddingV * 2 + 60);

  // Build SVG overlay with gradient + text
  const svgLines = lines
    .map((line, i) => {
      const y = paddingV + fontSize + i * lineHeight;
      return `<text
        x="50%"
        y="${y}"
        text-anchor="middle"
        dominant-baseline="auto"
        font-family="Arial, Helvetica, sans-serif"
        font-size="${fontSize}"
        font-weight="bold"
        fill="${textColor}"
        filter="url(#shadow)"
      >${escapeXml(line)}</text>`;
    })
    .join("\n");

  const svg = `
    <svg width="${width}" height="${gradientHeight}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="black" stop-opacity="0"/>
          <stop offset="100%" stop-color="black" stop-opacity="0.75"/>
        </linearGradient>
        <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="black" flood-opacity="0.8"/>
        </filter>
      </defs>
      <rect width="${width}" height="${gradientHeight}" fill="url(#grad)"/>
      ${svgLines}
    </svg>
  `;

  const svgBuffer = Buffer.from(svg);

  // Composite the SVG overlay onto the bottom of the image
  const result = await sharp(imageBuffer)
    .resize(width, height, { fit: "cover" })
    .composite([
      {
        input: svgBuffer,
        top: height - gradientHeight,
        left: 0,
      },
    ])
    .png()
    .toBuffer();

  return result;
}

// ── Helpers ───────────────────────────────────────────────────────────────

/**
 * Wraps text into lines of at most `maxChars` characters,
 * breaking on word boundaries.
 */
function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    if ((current + " " + word).trim().length <= maxChars) {
      current = (current + " " + word).trim();
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);

  return lines;
}

/** Escape special XML characters for safe SVG embedding. */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
