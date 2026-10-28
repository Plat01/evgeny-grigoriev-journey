# EG logo — 28.10.2026

Source: user attachment `photo_2026-10-28_13-35-39.jpg`, preserved as `assets/eg-logo-original.jpg`.
Final asset: `src/assets/eg-logo.svg`. The original JPEG is embedded as a luminance mask; its contours are preserved, black becomes transparent, and the letters use the site's ink #233d40. A small linear transfer removes JPEG noise on the black background. SVG is a self-contained wrapper around the original bitmap, not a vector tracing.

Imagegen was invoked for background extraction with this prompt:

> Use case: background-extraction. Asset type: existing EG monogram for website header. Edit the provided logo image: remove the entire black background, including black negative spaces inside the letters, to true alpha transparency. Preserve the exact distinctive contours and proportions of the two white stylized EG letters, no reinterpretation or redesign. Recolor both letters to a single solid dark forest teal #233d40. Crop output tightly to the monogram with only a small transparent margin. Flat solid color, crisp antialiased edges, no outline, no shadow, no glow, no additional text or symbols. The image must contain ONLY the original EG monogram on transparent background. Save output image locally so it can be copied into the website project.

The generated result introduced a glow and was rejected. It is not referenced by the site.

Scope: existing header refinement, preserving the surrounding design. Logo width 64px desktop, 52px mobile, with a minimum 44px link target. Accessible link name: «Евгений Григорьев — к началу».

## Verification

- `npm run check`: 0 errors, warnings or hints.
- `npm run build`: root and nested GitHub Pages base builds passed.
- Playwright MCP actually invoked against production preview at `/alex_evgenygrigoriev/`.
- Screenshots inspected at 390×844, 1366×768 and 1920×1080, at start/middle/end. No horizontal overflow, broken images or console errors.
- Keyboard focus reaches the logo. Menu and return-to-start link work with reduced motion and JavaScript disabled; all seven chapters remain available.
- Imagegen actually invoked; generated candidate rejected. No packages installed or connector registration changed in this task.

ROUND 1 — scoped header review
Seen in one second: dark EG monogram, matching the page's ink.
Idea: original supplied initials identify the existing journey without competing with the large name.
Live thing: existing link returns to the first chapter.
Layout words by section: header=logo left / menu and contact right; chapters unchanged.
Scores (header only): design 8 · usability 9 · creativity 8 · content 9 → overall 8.4.
Caps applied: none within the requested header scope; not a whole-page redesign assessment.
Top three problems: no visible header issues in the three viewport review sheets; no scope expansion needed.
