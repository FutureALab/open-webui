# Design QA — Official typography and effects parity

## Scope

- Reference: official mirror screenshots supplied from `http://localhost:3010/`.
- Implementation: local AIOps build served from an isolated QA instance.
- Included: typography hierarchy, foreground contrast, input surfaces, shadows, borders, switches, and Chrome 108 compatibility.
- Deliberately excluded: restructuring the settings page. The existing modal/settings framework is retained per user instruction.

## Evidence

| Surface | Reference | Implementation |
| --- | --- | --- |
| Populated chat | `C:\Users\csc\AppData\Local\Temp\codex-clipboard-74a022dd-985d-439a-8a72-1aaa8fc456a9.png` | `C:\Users\csc\.codex\visualizations\2026\07\31\019fb896-24c3-7051-b5d3-68878e00a9a2\official-style-qa-20260801\03-current-populated-chat-chrome108.png` |
| Admin settings | `C:\Users\csc\AppData\Local\Temp\codex-clipboard-d0bd9d9e-82f5-45d6-83fd-8d3dd417f085.png` | `C:\Users\csc\.codex\visualizations\2026\07\31\019fb896-24c3-7051-b5d3-68878e00a9a2\official-style-qa-20260801\02-current-settings-chrome108.png` |
| Empty chat | n/a | `C:\Users\csc\.codex\visualizations\2026\07\31\019fb896-24c3-7051-b5d3-68878e00a9a2\official-style-qa-20260801\01-current-chat-chrome108.png` |

- Browser: Chromium `108.0.5359.29` from Playwright 1.28.1.
- Viewport: 2048 × 968 CSS pixels.
- Captured image: 2048 × 968 physical pixels.
- Device scale factor: 1.
- Theme and locale: light, `zh-CN`.
- State: authenticated admin; populated GDP conversation for the chat comparison; General settings open for the settings comparison.

## Fidelity review

1. Content and structure — passed for the shared chat/sidebar/message/input regions. The official reference's artifact pane and open account menu are state-specific. Settings framework differences are explicitly out of scope.
2. Typography — passed. Archivo is restored for primary navigation and chat input surfaces; product title computes to 14 px / 500. Markdown headings and action rows restore the official semibold/medium hierarchy.
3. Color and effects — passed. Light-theme input boundaries and soft shadows remain visible in Chrome 108. Enabled switches compute to `rgb(0, 185, 129)` and disabled switches use the official neutral surface.
4. Imagery and iconography — passed. Existing AIOps branding is retained while icon sizing, stroke contrast, and action-row treatment align with the official UI.
5. Spatial and responsive behavior — passed for the requested style scope at 2048 × 968. No settings framework/layout changes were made.

## Interaction verification

- Message input accepted focus, text entry, selection, and clearing.
- Settings input accepted focus and retained a visible background/border.
- First settings switch changed `true → false → true`; the original value was restored.
- Sidebar expansion and admin settings navigation completed successfully.
- No page errors or failed application requests were recorded during the final flows.

## Compatibility and regression checks

- Targeted Vitest: 6/6 passed (`postcss-chrome109-fix.test.js`, `official-style-parity.test.js`).
- Production build: passed.
- Unsupported generated CSS color tokens (`color-mix`, `oklab`, `oklch`, `display-p3`): 0.
- Final visual pass found no actionable P0, P1, or P2 issue in the requested scope.

## Iteration history

1. Restored the official historical typography classes only where the non-font line signature still matched the official source.
2. Restored Archivo on primary navigation/chat surfaces and official medium/semibold hierarchy on message and settings labels.
3. Restored official green switches and low-contrast input surfaces, then rebuilt for Chrome 108 fallbacks.
4. Repeated authenticated Chrome 108 visual and interaction checks with a populated conversation and the General settings panel.

final result: passed
