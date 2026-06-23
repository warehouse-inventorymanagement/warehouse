/**
 * SVG sanitizer — strips all known XSS vectors before storage.
 * Uses an allowlist approach for href/src values to close regex bypass gaps.
 */
export function sanitizeSvg(svgData: string): string {
  let s = svgData;

  // Remove <script> blocks
  s = s.replace(/<script[\s\S]*?<\/script>/gi, '');
  s = s.replace(/<script[\s\S]*?\/?>/gi, '');

  // Remove event handler attributes (on*)
  s = s.replace(/\s+on\w+\s*=\s*"[^"]*"/gi, '');
  s = s.replace(/\s+on\w+\s*=\s*'[^']*'/gi, '');
  s = s.replace(/\s+on\w+\s*=\s*[^\s>]+/gi, '');

  // Remove <foreignObject> — can embed arbitrary HTML
  s = s.replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, '');
  s = s.replace(/<foreignObject[\s\S]*?\/?>/gi, '');

  // Remove <embed>, <object>, <iframe>
  s = s.replace(/<(embed|object|iframe)[\s\S]*?<\/\1>/gi, '');
  s = s.replace(/<(embed|object|iframe)[\s\S]*?\/?>/gi, '');

  // Remove ALL <use> elements — href, xlink:href, and data: URI variants can all be abused
  s = s.replace(/<use[\s\S]*?\/>/gi, '');
  s = s.replace(/<use[\s\S]*?<\/use>/gi, '');

  // Allowlist href/src: only plain fragment (#id) or relative image paths are kept
  s = s.replace(
    /\b(href|src)\s*=\s*"([^"]*)"/gi,
    (_match, attr, value) => {
      const v = value.trim();
      if (/^#[\w\-\.]+$/.test(v)) return `${attr}="${v}"`;
      if (/^[\w\-\.\/]+\.(svg|png|jpg|jpeg|gif|webp)$/i.test(v)) return `${attr}="${v}"`;
      return `${attr}=""`;
    }
  );

  // Strip xlink:href — only allow fragment references (#id)
  s = s.replace(
    /\bxlink:href\s*=\s*"([^"]*)"/gi,
    (_match, value) => {
      const v = value.trim();
      return /^#[\w\-\.]+$/.test(v) ? `xlink:href="${v}"` : 'xlink:href=""';
    }
  );

  // Belt-and-suspenders: strip javascript: in any remaining attribute values
  s = s.replace(/([a-zA-Z\-:]+)\s*=\s*"[^"]*javascript:[^"]*"/gi, '$1=""');
  s = s.replace(/([a-zA-Z\-:]+)\s*=\s*'[^']*javascript:[^']*'/gi, "$1=''");

  // Strip url() in style attributes (CSS-based exfiltration / external load)
  s = s.replace(/style\s*=\s*"([^"]*)"/gi, (_m, style) =>
    `style="${style.replace(/url\s*\([^)]*\)/gi, 'url()')}"`
  );

  return s;
}
