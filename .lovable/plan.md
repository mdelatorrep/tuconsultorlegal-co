

# Fix: Redacción module - Copilot timing and drafting reliability

## Issues identified

1. **Copilot visible from the start**: `showCopilot` is initialized to `true` on line 71 of `DraftModule.tsx`. The copilot panel should only appear after content has been generated, since it's contextual to the document being edited.

2. **Drafting may appear "broken" due to credit check**: The "Generar con IA" button requires 21 credits (`draft` tool cost). If the user doesn't have enough credits, the button is silently disabled with no clear feedback about why. Additionally, error handling in the generation flow could swallow useful information.

## Plan

### 1. Hide Copilot until document is generated
- Change `showCopilot` initial state from `true` to `false`
- Auto-show the copilot when content is successfully generated (`setShowCopilot(true)` inside `handleGenerate` success path)
- Keep the toggle button so users can hide/show it after generation

### 2. Improve drafting feedback and error visibility
- When `hasEnoughCredits('draft')` is false and user hasn't generated yet, show a visible message below the generate button indicating insufficient credits and the amount needed
- Add better error logging in the catch block to surface the actual error message
- Move the credit check toast to appear when the user clicks the button (already exists on line 97-104), but also add a visible inline warning near the button
- Ensure the `consumeCredits` failure after successful AI generation doesn't prevent the content from being displayed (move `consumeCredits` to after `setEditorContent`)

### 3. Minor UX improvements
- Remove the copilot toggle button from the top bar when no content has been generated yet (no point toggling something that shouldn't be visible)
- After generation, show the copilot toggle button

### Files to modify
- `src/components/lawyer-modules/DraftModule.tsx`: Change `showCopilot` default, auto-show on generation, add credit feedback, reorder operations in `handleGenerate`

