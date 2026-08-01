# Design QA — Official UI scale polish

## Comparison target

- Source visual truth:
  - Main page: `C:\Users\csc\AppData\Local\Temp\codex-clipboard-806e80fe-37fa-49b4-aa93-f950534cec6e.png`
  - Account menu: `C:\Users\csc\AppData\Local\Temp\codex-clipboard-e83e7a69-e8c8-48e2-aa69-4e2515905dc3.png`
  - Settings: `C:\Users\csc\AppData\Local\Temp\codex-clipboard-14bc0462-182a-4b6e-b1ec-0f2ed1e3bcaa.png`
- Browser-rendered implementation:
  - `E:\Project\open-webui\output\playwright\official-parity-20260801\main-chrome108-final.png`
  - `E:\Project\open-webui\output\playwright\official-parity-20260801\account-menu-chrome108-final.png`
  - `E:\Project\open-webui\output\playwright\official-parity-20260801\settings-chrome108-final.png`
  - Responsive evidence: `E:\Project\open-webui\output\playwright\official-parity-20260801\main-1366-chrome108.png` and `settings-1366-chrome108-final.png`

## Capture normalization

- Browser: Playwright Chromium `108.0.5359.29`.
- Primary implementation viewport and image: 2048 × 968 CSS pixels, 2048 × 968 physical pixels, device scale factor 1.
- Source main page: 2048 × 968 pixels and directly comparable at 1:1.
- Source account menu: 930 × 874 cropped region with unknown source viewport. It was compared as a focused region and normalized by its width relative to the visible sidebar rather than by raw pixels.
- Source settings: 1812 × 978 pixels; implementation is the retained local unified settings framework at 2048 × 968. Typography, contrast, and navigation density were compared; the differing framework and memory-list state were not treated as fidelity defects because the user explicitly excluded a settings-framework redesign.
- State: authenticated administrator, light theme, `zh-CN`, `deepseek-v4-flash` selected; account menu open and Personalization/Memory settings selected for their respective captures.

## Findings

No actionable P0, P1, or P2 differences remain in the requested scope.

- Fonts and typography: passed. Primary navigation computes to 16px with the saved text scale, the settings tabs and content labels compute to 14px, the account menu computes to 14px with a 16px/600 identity line, the landing model title computes to 30px, and suggestions compute to 16px. Archivo/Inter and system CJK fallbacks retain the existing product font strategy, with kerning and antialiasing enabled.
- Spacing and layout rhythm: passed. The main sidebar is 260px, matching the source proportion. The main input and title alignment closely track the 1:1 source. The account menu now measures 242px and visually fills the sidebar region without clipping. The settings structure was intentionally retained.
- Colors and visual tokens: passed. Account identity text computes to `rgb(22, 22, 22)` at weight 600; the enabled switch, input border, light surfaces, and shadows remain visible in Chrome 108.
- Image quality and asset fidelity: passed. Existing favicon, model avatar, profile avatar, and icon components remain sharp and unmodified; no placeholder, CSS-art, emoji, or custom SVG substitute was introduced.
- Copy and content: passed for static UI strings. Dynamic prompt suggestions and the AIOps/model avatars differ from the official mirror data by design, not because of visual implementation drift.
- Icons and interaction states: passed. Icon scale remains optically aligned with the enlarged text. Input focus, menu open, selected settings tab, and enabled switch states are visibly distinct.
- Responsive behavior: passed at 2048 × 968 and 1366 × 768. There is no horizontal overflow; the main input, account menu, settings modal, and save action remain inside the viewport.

## Full-view and focused comparison evidence

- Full-view comparison: the 2048 × 968 source and final main screenshots were opened together. Sidebar width, central composition, title hierarchy, input position, and suggestion density are closely aligned.
- Focused menu comparison: the source crop and final account-menu screenshot were opened together. Raw pixel dimensions were not compared because the source is cropped at an unknown scale; sidebar-relative width, type hierarchy, avatar scale, row rhythm, and foreground contrast were compared instead.
- Focused settings comparison: the source and final Personalization screenshots were opened together. Shared navigation and content typography now use the larger official-like hierarchy. Framework and state differences are documented above.

## Interaction and compatibility verification

- Opened the account menu, navigated to Settings, switched to Personalization, and focused the message input.
- Input focus retained a visible `rgb(235, 235, 235)` border and soft elevation.
- At 1366 × 768, the account menu and settings modal both reported `fits: true`; document horizontal overflow was `false`.
- Browser console/page errors during the final authenticated flow: 0.
- Targeted Vitest: 7/7 passed (`postcss-chrome109-fix.test.js`, `official-style-parity.test.js`).
- Production build: passed.
- Unsupported generated CSS tokens for Chrome 108 (`color-mix`, `oklab`, `oklch`, `display-p3`): 0.

## Comparison history

1. Initial comparison found a P2 scale mismatch: the local sidebar was 245px, common settings labels were 12px, the account menu mixed 12–13px text, and the landing title/suggestions were visibly smaller than the source. Fix: moved the shared components to the measured 260px/14–16px hierarchy and rebuilt.
2. First post-fix comparison found a remaining P2 account-menu proportion/contrast mismatch: the menu was about 8px narrower than the source-normalized target and the identity line was optically weak. Fix: widened the popup, set the identity line to 600 weight, strengthened foreground tokens, rebuilt, and recaptured.
3. Final comparison found no actionable P0/P1/P2 mismatch. Chrome 108 desktop and responsive captures confirmed stable layout and interaction states.

## Follow-up polish

- P3: the official mirror and this project use different brand/model/profile assets and dynamic suggestion content. These are expected product-data differences and were intentionally retained.

final result: passed
