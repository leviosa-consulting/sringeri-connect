---
name: ChatbotWidget mode props
description: ChatbotWidget's conversation-mode and human-handoff props are independent — read before adding a new usage of this widget.
---

The reusable chat widget's "always answer as a bot, skip the offline team-choice gate" behavior and "show a way to reach a human" behavior are controlled by two separate, independently-composable props — not one combined flag.

**Why:** An earlier version conflated the two into a single flag, which made the widget's only production usage implicitly mean "humans are unreachable from here." Adding a second usage that wanted bot-first behavior *and* a visible escalation path required splitting them rather than special-casing the single flag.

**How to apply:** When adding a new usage of the widget, decide the conversation-start mode and the human-escalation affordance separately based on that surface's needs, rather than assuming one prop controls both. A widget acting as the sole/primary launcher on a page (replacing the persistent app-wide chat icon) also needs its own visitor-wide unread-badge check while closed, since it has no loaded conversation to poll until first opened — don't rely solely on per-conversation polling for that case.
