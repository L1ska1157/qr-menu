# UX Requirements Quality Checklist: QR Code Restaurant Menu & Ordering System

**Purpose**: Lightweight pre-planning sanity check — validates that UX and interaction flow requirements are complete, clear, and unambiguous before proceeding to planning
**Created**: 2026-04-06
**Feature**: [spec.md](../spec.md)
**Audience**: Author self-review
**Focus**: UX & interaction flows

## Menu Display & Navigation

- [x] CHK001 - Is "instantly" in the category navigation scroll requirement quantified with a specific timing threshold? [Clarity, Spec §FR-003]
- [x] CHK002 - Are loading state requirements defined for the initial menu page load (e.g., placeholder, spinner, or skeleton screen)? [Gap, Completeness] ✓ N/A — no loading state required by design
- [x] CHK003 - Are requirements defined for empty-category states — if a category has no available items, is it hidden, shown greyed out, or shown with a message? [Edge Case, Gap] ✓ FR-001: empty categories not shown
- [x] CHK004 - Are unavailable or sold-out menu item display requirements specified — how should such items appear in the browsable menu? [Coverage, Spec §Edge Cases] ✓ FR-002: grey text/image, "SOLD OUT" price label

## Cart Interaction

- [x] CHK005 - Are minimum and maximum quantity constraints for individual cart items specified? [Completeness, Gap] ✓ FR-004: no maximum; decrement to 0 removes item
- [x] CHK006 - Are requirements defined for cart persistence — what happens to cart contents if the diner closes or refreshes the browser before submitting? [Edge Case, Gap] ✓ FR-020: cart is server-side and shared; reload or rescan restores it
- [x] CHK007 - Are requirements specific enough to describe what the diner sees immediately after submitting an order (confirmation message content, cart cleared state, next available action)? [Clarity, Spec §FR-006, FR-017] ✓ FR-006: confirmation message + return-to-menu button; cart cleared
- [x] CHK008 - Is the transition from "order submitted" to "new empty cart available" explicitly specified as part of the multi-round flow? [Clarity, Spec §FR-017] ✓ FR-017: cart cleared; new order can start immediately

## Multi-Round Ordering Flow

- [x] CHK009 - Are requirements defined for how diners can view their previous order rounds during the same session (e.g., order history section, summary panel)? [Completeness, Gap] ✓ FR-009: cart view shows all unpaid orders for the session
- [x] CHK010 - Is it specified whether diners can see a running cumulative total across all rounds at any point before initiating payment? [Completeness, Gap] ✓ FR-009: cart shows total unpaid sum across all orders

## Payment Flow

- [x] CHK011 - Are the bill screen requirements specific about what is shown before tapping "Pay" — does it aggregate items across all ordering rounds? [Completeness, Spec §FR-008, FR-016] ✓ FR-009: cart shows all unpaid orders; "Pay all" covers full session tab
- [x] CHK012 - Are requirements defined for the redirect handoff to the external payment provider — is there a transition screen or loading state before the redirect occurs? [Completeness, Spec §FR-009] ✓ N/A — immediate redirect, no transition screen by design
- [x] CHK013 - Are post-redirect confirmation screen requirements specific enough to be unambiguous — what exactly is displayed on success vs. failure? [Clarity, Spec §FR-010] ✓ FR-010: returns to menu page with success/failure message
- [x] CHK014 - Is the mixed-payment scenario addressed in requirements — can a diner pay for one order immediately and defer remaining orders to a final bill, and if so, what does the bill screen show? [Coverage, Spec §FR-016] ✓ FR-009: individual Pay per order + Pay all option
- [x] CHK015 - Are requirements defined for when the diner does not return to the menu interface after the external payment redirect (e.g., browser closed mid-redirect)? [Edge Case, Spec §Edge Cases] ✓ Orders remain unpaid until webhook confirms payment; no partial state — order is either paid or not

## Call Waiter Flow

- [x] CHK016 - Is the visual state of the "Call Waiter" button during the 2-minute cooldown period specified (e.g., disabled, countdown visible, greyed out with message)? [Clarity, Spec §FR-012] ✓ FR-012: grey button with circular countdown outline
- [x] CHK017 - Are requirements defined for whether the cooldown timer remaining is visible to the diner, and if so, how it is communicated? [Completeness, Gap] ✓ FR-012: circular outline countdown shows remaining time

## Session & QR Code States

- [x] CHK018 - Is the message shown to a diner when their session token has expired defined with enough specificity to be acted upon without further clarification? [Clarity, Spec §FR-014, FR-018] ✓ FR-014: error page shows "Old page"
- [x] CHK019 - Are requirements defined for what the diner is instructed to do after an expired or invalid session (e.g., ask staff to regenerate the QR code, scan again)? [Completeness, Gap] ✓ FR-014: "If you just scanned a QR code and see this page, call the administration"
- [x] CHK020 - Are requirements defined for the shared-session scenario — when two diners at the same table both have the menu open, does placing an order on one device affect what the other sees? [Coverage, Spec §User Story 4] ✓ FR-020: one shared server-side cart per table

## Error & Offline States

- [x] CHK021 - Are requirements defined for the diner's experience when connectivity is lost mid-session (e.g., during browsing, after adding to cart, during order submission, during payment)? [Coverage, Spec §Edge Cases] ✓ FR-020 + Assumptions: reload or rescan restores full state from server
- [x] CHK022 - Is the UX behavior specified when a menu item already in the cart becomes unavailable before the diner submits their order? [Coverage, Spec §Edge Cases] ✓ FR-019: availability checked on submit; order rejected with message identifying unavailable items
- [x] CHK023 - Are requirements defined for browser back-button behavior during the external payment redirect flow? [Edge Case, Gap] ✓ FR-010: returns to menu page with payment failure message

## Notes

- Check items off as completed: `[x]`
- Add findings or spec update notes inline after each item
- Items marked `[Gap]` indicate requirements not yet present in the spec — these may need to be added before planning
- Items marked `[Clarity]` indicate existing requirements that are too vague to implement unambiguously
- **Last updated**: 2026-04-06 after user spec additions (FR-001, FR-002, FR-004, FR-006, FR-009, FR-010, FR-012, FR-017, FR-018, FR-019)
