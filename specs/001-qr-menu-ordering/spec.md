# Feature Specification: QR Code Restaurant Menu & Ordering System

**Feature Branch**: `001-qr-menu-ordering`
**Created**: 2026-04-06
**Status**: Draft
**Input**: User description: "A web-based restaurant menu accessible via a QR code on the table, featuring a full list of dishes and end-to-end ordering capabilities."

## Clarifications

### Session 2026-04-06

- Q: Does this feature include a staff-facing interface (kitchen display or waiter dashboard)? → A: Staff interface is a separate feature; this spec covers the diner-facing experience only.
- Q: Is payment collected at the time of placing each order, or at the end of the dining session? → A: Both modes are supported — diners can pay immediately after each order or accumulate a tab and settle a single consolidated bill at any time.
- Q: Can diners place multiple rounds of orders during the same table visit? → A: Yes — diners can submit new orders at any point during their visit; each submission creates a separate order record linked to the same table session.
- Q: How is the table session protected from unauthorized access (e.g., someone guessing another table's URL)? → A: The QR code URL contains a time-limited session token that expires at the end of the service period (e.g., daily or per shift); expired or unrecognized tokens are rejected.
- Q: What is the scope of payment within the menu interface? → A: Tapping "Pay" redirects the diner to an external payment provider; the menu interface shows a confirmation screen after the diner returns from the provider.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Browse Menu & Place Order (Priority: P1)

A diner scans the QR code on their table with a smartphone camera. The menu loads in their mobile browser — no app download required. They browse categorized menu items, read descriptions and ingredients, check estimated prep times and prices, and add desired items to a cart. When ready, they submit their order.

**Why this priority**: Core value proposition — every other feature depends on this flow. A diner can successfully order food without completing payment or calling a waiter.

**Independent Test**: A tester scans a test QR code, browses the full menu, adds items to a cart, and submits an order. The order is recorded with the correct table ID, selected items, and total.

**Acceptance Scenarios**:

1. **Given** a diner is seated at a table with a QR code, **When** they scan it with their phone camera, **Then** the restaurant menu opens in their browser within 3 seconds showing all categories and items
2. **Given** the menu is loaded, **When** the diner taps a category in the navigation bar, **Then** the page scrolls instantly to that category section
3. **Given** the diner is viewing a menu item, **When** they tap "Add to Cart", **Then** the item is added and the cart counter updates to reflect the new total
4. **Given** the cart contains at least one item, **When** the diner reviews their cart and confirms the order, **Then** the order is submitted and the diner sees an on-screen confirmation

---

### User Story 2 - Pay Bill Online (Priority: P2)

A diner can choose to pay immediately after placing an order, or accumulate a running tab and settle the full bill at any point before leaving. In either case, they access the payment section from the menu interface, review an itemized summary of what is owed, and complete online payment from their phone.

**Why this priority**: Directly fulfills the "end-to-end ordering" promise. Reduces table wait time and improves restaurant throughput.

**Independent Test**: A tester with an existing order navigates to the bill view, initiates payment, completes the transaction, and receives on-screen confirmation.

**Acceptance Scenarios**:

1. **Given** a diner has placed an order, **When** they navigate to the payment section, **Then** they see an itemized breakdown of ordered items, quantities, and the total amount due
2. **Given** the diner views their bill, **When** they tap "Pay" and complete the transaction on the external provider's page, **Then** they are returned to the menu interface showing a clear payment confirmation
3. **Given** a payment attempt fails or is cancelled on the external provider's page, **When** the diner returns to the menu interface, **Then** they see a failure message and can retry payment without losing their bill details

---

### User Story 3 - Request Waiter Assistance (Priority: P3)

A diner needs to speak with a waiter — for a special request, allergy question, or any issue. They tap the "Call Waiter" button in the interface. The staff is notified that the table requires attention.

**Why this priority**: Provides a critical service fallback. Ensures diners are not stranded without human assistance even if they prefer not to use the digital ordering flow.

**Independent Test**: A tester taps the "Call Waiter" button; the system registers a service request for the correct table and shows on-screen confirmation.

**Acceptance Scenarios**:

1. **Given** a diner needs assistance, **When** they tap "Call Waiter", **Then** a service request is submitted for their table and they see a confirmation message
2. **Given** a request was submitted recently, **When** the diner taps "Call Waiter" again within 2 minutes, **Then** the system prevents a duplicate request and informs the diner that a request is already active
3. **Given** a waiter request has been submitted, **When** the diner views the button, **Then** it clearly indicates the request is pending

---

### User Story 4 - Table Identification via QR Code (Priority: P4)

Each physical table has a unique QR code. When scanned, it automatically identifies the table so that all subsequent actions — browsing, ordering, paying, calling a waiter — are correctly linked to that specific table.

**Why this priority**: Foundational infrastructure for accurate order routing, but not a visible user-facing feature on its own.

**Independent Test**: QR codes from two different tables are scanned; orders placed from each are recorded with distinct, correct table IDs.

**Acceptance Scenarios**:

1. **Given** a QR code was generated for Table 5, **When** a diner scans it, **Then** the menu session is bound to Table 5 and all actions use that table ID
2. **Given** two diners at the same table both scan the QR code, **When** each views the menu, **Then** both are treated as part of the same table session
3. **Given** an invalid or unrecognized QR code link is opened, **When** the page loads, **Then** the diner sees a clear, friendly error message explaining the issue

---

### Edge Cases

- What happens when a diner scans the QR code but has no internet connection?
- How does the system handle a menu item that becomes unavailable after the diner has already added it to their cart?
- What happens if a payment session times out or the browser is closed mid-payment?
- How does the system handle a QR code that has been regenerated or reassigned to a different table?
- What happens when two separate groups occupy the same table across different visits with overlapping sessions?
- What happens if the diner's browser does not return to the menu interface after completing payment on the external provider (e.g., browser closed mid-redirect)?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display the full restaurant menu organized into named categories (e.g., Starters, Mains, Desserts, Drinks); categories with no available items MUST NOT be shown in the menu or navigation bar
- **FR-002**: Each menu item MUST display its name, description, list of ingredients, estimated preparation time, and price; sold-out items MUST remain visible in the menu but displayed with greyed-out text and image, with the price replaced by a "SOLD OUT" label
- **FR-003**: System MUST provide a sticky category navigation bar at the top of the page; tapping a category scrolls the view to that section 
- **FR-004**: Users MUST be able to add menu items to a cart and adjust item quantities; there is no maximum quantity per item; decrementing an item's quantity to zero MUST remove it from the cart automatically
- **FR-005**: System MUST associate the user session and all actions (orders, payments, waiter requests) with the table ID encoded in the scanned QR code
- **FR-006**: Users MUST be able to review their cart contents and submit an order; immediately after submission the cart MUST be cleared and the user MUST see a confirmation message with a button to return to the main menu page
- **FR-007**: System MUST record each submitted order with: table ID, ordered items and quantities, total amount, and submission timestamp
- **FR-008**: Users MUST be able to view an itemized bill for their table showing all ordered items and the total amount due
- **FR-009**: The cart view MUST display only the current session's unpaid orders; each unpaid order MUST have an individual "Pay" button; the cart MUST show the total unpaid sum across all orders; at the bottom of the page a "Pay all" option with a checkbox MUST allow the diner to pay all unpaid orders in a single transaction
- **FR-010**: Tapping "Pay" (individual order) or confirming "Pay all" MUST immediately redirect the diner to the external payment provider; after payment succeeds or fails the diner MUST be returned to the menu page with a visible success or failure message
- **FR-011**: Users MUST be able to tap a "Call Waiter" button to submit a service request linked to their table
- **FR-012**: System MUST enforce a 2-minute cooldown per table between "Call Waiter" requests; during the cooldown the button MUST appear grey and display a visual circular countdown outline showing the remaining time until the next request is allowed
- **FR-013**: Each physical table MUST have a unique QR code encoding its permanent table ID; the QR code never changes and does not contain a session token
- **FR-014**: When a diner scans the QR code the system MUST check whether the table has an active or paid session and show a landing page accordingly:
  - **Table taken** (active or paid session exists): display "This table is taken. Would you like to append?" with a "Yes" button that opens the main menu page joined to the existing session
  - **Table free** (no open session): display "Welcome to {restaurant name}" with a "To menu" button that creates a new session and opens the main menu page
- **FR-014a**: If the table ID in the QR code does not exist in the system the landing page MUST show the message "Old page" with the instruction "If you just scanned a QR code and see this page, call the administration"
- **FR-018**: A new session for a table can only be created when the previous session on that table is `closed`; the waiter closes a session when cleaning the table after guests leave
- **FR-020**: The cart is shared across all devices at the same table — any diner who opens the menu at a given table sees and edits the same cart; cart state is persisted server-side so that reloading the page or rescanning the QR code restores the current cart without data loss
- **FR-019**: Menu item availability is re-fetched on every page load; cart items whose `is_available` has become `false` since they were added MUST be displayed in grey in the cart (same visual treatment as in the menu) indicating they cannot be ordered; before confirming an order submission the system MUST verify availability server-side and reject the order with a message identifying any unavailable items so the diner can remove them and resubmit
- **FR-017**: After submitting an order, the cart MUST be cleared; diners MUST be able to immediately start a new order for the same table session; all submitted orders from the same session accumulate as unpaid orders visible in the cart view until paid
- **FR-015**: This feature covers the diner-facing experience only. A staff-facing interface (kitchen display, waiter dashboard, order management) is out of scope and will be addressed as a separate feature. Orders and waiter call requests submitted by diners MUST be persisted so they are available for retrieval by the future staff interface.
- **FR-016**: The system MUST support two payment modes: (a) immediate payment at the time of placing an order, and (b) deferred payment where the diner accumulates a running tab and settles a single consolidated bill at any time before leaving. The diner chooses when to pay.

### Key Entities

- **Table**: Unique identifier, table number; QR code encodes the table ID permanently
- **Menu Category**: Name, display order; shown on page only when at least one available item exists in the category
- **Menu Item**: Name, description, ingredients list, estimated preparation time, price, category, availability status
- **Cart**: Table ID, list of items with quantities, session timestamp
- **Order**: Table ID, ordered items with quantities, total price, placement timestamp, order status
- **Payment**: Associated order(s), amount paid, payment mode (immediate or deferred), payment status, completion timestamp; a table may have multiple partial payments or one consolidated payment
- **Waiter Request**: Table ID, request timestamp, cooldown status

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Diners can scan a QR code and view the full menu on their device within 3 seconds on a standard mobile connection
- **SC-002**: Diners can browse the menu, build a cart, and submit an order in under 3 minutes
- **SC-003**: 95% of diners successfully complete the ordering flow on their first attempt without external assistance
- **SC-004**: Online payment completion rate is 90% or higher among diners who initiate the payment flow
- **SC-005**: "Call Waiter" requests are acknowledged with on-screen feedback within 2 seconds of the tap
- **SC-006**: QR code scanning correctly identifies the table in 100% of scans under normal network conditions
- **SC-007**: The full menu and ordering flow is usable on any modern smartphone browser without requiring app installation

## Assumptions

- All session state (orders, cart contents, payment status, waiter requests) is persisted server-side; closing or refreshing the browser, or rescanning the QR code, restores the full session state including any in-progress cart
- Diners have a smartphone with a camera capable of scanning QR codes and a modern mobile browser
- The restaurant has a working internet connection; the system requires connectivity to function
- Menu content (items, descriptions, prices, categories) is pre-configured outside this feature's scope — menu management is a separate feature
- No diner account, login, or registration is required; scanning the table QR code is the sole means of accessing the menu and joining a session
- The system operates in a single currency; multi-currency support is out of scope
- Multi-language support is out of scope for the initial version; the menu is displayed in a single language
- Diners can place multiple rounds of orders during the same visit. Each cart submission creates a new order record; all orders from the same table session are linked by table ID and contribute to the running bill.
