You are designing an internal web application called **AezCheck Accounting**.

This is a real operational accounting reconciliation system, not a landing page or conceptual dashboard.

## 1. Product purpose

The system automates the reconciliation process between:

* Bank payment transactions
* Facebook Bills uploaded by CS
* TKQC / Card ownership data
* Customer accounting sheets

The main goal is to reduce manual work for Accounting, including:

* Finding missing Facebook Bills
* Matching Bank transactions with Facebook Bills
* Finding which CS is responsible for a missing bill
* Asking CS to supplement missing bills
* Reminding CS
* Rechecking newly uploaded bills
* Managing explanations
* Closing reconciliation sessions
* Generating reconciliation reports

## 2. Main user roles

### Admin

Can access system-wide operational and administrative data.

### Accounting

Main operational user responsible for reconciliation.

### CS

Only handles their own missing bills, uploads Facebook Bills and submits explanations.

### Team Leader

Only sees relevant data for their own team.

Role permissions will be designed separately.

For now, Admin and Accounting share the main reconciliation UI.

## 3. Core data sources

The system uses four main sources:

1. Customer Sheets
2. TKQC / Card / CS ownership data
3. Bank transaction files
4. Facebook Bill files

TKQC and Card ownership must support historical ownership.

Example:

TKQC A:

* Mạnh: 01/08–05/08
* Huyền: from 06/08

A missing bill dated 03/08 belongs to Mạnh, not the current owner.

## 4. Reconciliation sessions

The system automatically creates **one reconciliation session per data day**.

Multiple sessions may be active simultaneously.

A session currently has a 48-hour processing period.

Example:

Data session:
08/08/2026

Processing period:
09/08–10/08

The exact session closing time is still pending business confirmation.

Do not hard-code an exact closing hour unless explicitly instructed later.

## 5. Reconciliation trigger

When Bank data is uploaded:

* Normalize Bank data
* Only eligible SUCCESS transactions enter reconciliation

When Facebook Bills are uploaded:

* Parse data
* Immediately run reconciliation again

New Facebook Bills can automatically resolve existing missing bills.

## 6. Matching principle

Primary matching fields:

* Reference Code
* Card Last 4

Amount is used for validation.

Facebook Bill date and Bank transaction date may differ.

Bank transactions can normally appear around 3–4 days after the Facebook Bill.

## 7. Current exception scope

Current scope includes:

* Missing Facebook Bill
* Amount Mismatch
* Duplicate Reference with different information
* Facebook Bill without corresponding Bank transaction
* CS explanation when a bill cannot be found

DO NOT include:

* Bill bùng
* TKQC BACK
* Bill HOLD

These are out of scope for the current phase.

## 8. Missing bill workflow

When a Bank transaction cannot find a corresponding Facebook Bill:

1. Detect missing bill
2. Determine responsible CS using historical ownership
3. Assign missing bill to CS
4. Notify CS through Telegram
5. Record T0
6. CS searches for the bill
7. CS uploads or pastes Facebook Bill
8. System immediately reconciles again
9. Successfully matched bills are automatically removed from missing backlog

If CS cannot find the bill:

CS submits an explanation with:

* Reason
* Description
* Evidence link
* Image/file attachment

Admin/Accounting reviews the explanation.

## 9. Reminder

T0 is the first time the system detects the missing bill and notifies the CS.

If the CS has taken no business action after 24 hours:

Send a Telegram reminder.

Business actions include:

* Upload Facebook Bill
* Paste Facebook Bill
* Submit explanation
* Resubmit requested information

Login or simply viewing the screen does NOT count as an action.

## 10. Session closing

When the session processing period ends:

* Close the session
* CS can no longer supplement bills or submit explanations into that session
* All unresolved items are recorded
* Generate session closing report
* Notify relevant Admin / Accounting / Team Leader through Telegram

## 11. Financial reconciliation metrics

Always distinguish these three metrics:

### Total Reconciled Spend

Amount successfully reconciled Bank ↔ Facebook.

### Total Bank Spend

Total eligible Bank SUCCESS amount.

Also display:
Bank Unreconciled Amount.

### Total Facebook Spend

Total Facebook Bill amount.

Also display:
Facebook Unreconciled Amount.

Example:

Bank = $150
Facebook = $100
Matched = $100

Display:

Total Reconciled = $100
Total Bank = $150
Bank Unreconciled = $50
Total Facebook = $100

If Facebook contains bills without corresponding Bank transactions:

Their amount contributes to Facebook Unreconciled Amount.

## 12. Reconciliation progress

IMPORTANT:

Session progress is calculated by **bill count**, NOT monetary value.

Formula:

Reconciliation Progress =
Number of reconciled Bank bills /
Total eligible Bank bills
× 100%

Example:

Total Bank bills = 5,284
Reconciled Bank bills = 4,901
Unreconciled = 383

Progress = 92.8%

Display:

92.8% reconciled
4,901 / 5,284 bills
383 bills remaining

Financial progress is represented separately by financial KPI cards.

## 13. Dashboard filtering principle

Dashboard date filters always refer to **reconciliation session date / data date**, NOT the current processing date.

Example:

Filter:
08/08 → 10/08

Include sessions:
08/08
09/08
10/08

Every component on the Dashboard must respond to the active filters.

This includes:

* Financial KPI
* Bill counts
* CS counts
* Exception counts
* Session progress
* Tables
* Charts
* Work queues

When multiple sessions are selected:

Financial metrics = sum across selected sessions.

Bill counts = sum across selected sessions.

Unique CS metrics = count unique CS, do not double count the same CS across sessions.

Reconciliation progress:

SUM(reconciled Bank bill count)
/
SUM(eligible Bank bill count)

Filters may include:

* Session date range
* Team
* CS

## 14. Notifications

Do NOT create a Notification module or notification feed.

Operational notifications will be sent through Telegram.

The system should still store notification delivery events in Audit Log for traceability.

## 15. Auditability

The system must be designed for strong auditability.

Important actions must be traceable, including:

* Data upload
* Reconciliation result
* Missing bill assignment
* CS action
* Explanation
* Admin/Accounting approval
* Session creation
* Session closing
* Report export
* Settings changes
* Telegram notification delivery

## 16. Design system

Use the same visual direction for every screen.

Desktop-first internal SaaS application.

### Colors

App background:
#F5F7FB

Sidebar:
#101828

Sidebar active:
#1D2939

Primary:
#2563EB

Primary text:
#182230

Secondary text:
#667085

Border:
#E4E7EC

Success:
#12B76A

Warning:
#F79009

Error:
#F04438

Purple:
#7F56D9

### UI style

* Inter font
* White cards
* 1px subtle borders
* 12–14px card radius
* Very light shadows
* Compact layout
* Dense but readable data tables
* Small semantic status badges
* 8–9px button radius
* Clear information hierarchy
* Monetary values right aligned
* Professional internal operations software appearance

Avoid:

* Marketing UI
* Gradients
* Glassmorphism
* Oversized typography
* Excessive empty space
* Decorative illustrations
* Consumer mobile-app styling

Prioritize:

* Operational clarity
* Fast scanning
* Data density
* Clear status
* Auditability
* Drill-down
* Low learning curve for operational users

## 17. Interaction principle

The UI should feel like a real working system.

Support:

* Clickable KPI cards
* Drill-down
* Row click
* Detail modal
* Filter states
* Loading states
* Empty states
* Success/error states
* Disabled states
* Tooltips where necessary

Do not redesign existing screens when adding a new module.

New modules must reuse the existing layout, components, spacing, typography, colors and interaction patterns.
