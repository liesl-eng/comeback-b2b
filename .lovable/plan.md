# Simplify order requests

## Changes
- Replace every buyer-facing “Add to Order Request” label with “Add to Request.”
- Remove collection selection, creation, renaming, deletion, and collection summaries from the buyer order flow.
- Store all requested products in one persistent list, preserving existing quantities when customers already have a saved order.
- Show one flat editable item list in the order drawer and review screen.
- Submit and save one flat item list while retaining compatibility with the existing order records and admin order history.

## Technical details
- Simplify the order context from multiple named collections to one order-items array, including a one-time read migration from the current saved collection format.
- Simplify the product-card quantity popover to quantity controls plus one “Add to Request” action.
- Flatten the order bar payload and database inserts; stop displaying or transmitting collection groupings.
- Update the admin order detail view to show one item table without collection headings.
- Verify compilation and the add, edit, review, and submit-request screens on desktop and mobile.
