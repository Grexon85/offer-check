# Backlog

Ordered roughly by value. Move items to "Done" as they ship.

## Next

- [ ] **Guidance next to judgement fields.** Typical pension and bonus norms by employer type (bank, big tech, consultancy, public sector, start-up), so users don't set bonus reliability or uplift lines optimistically.
- [ ] **Employer type picker** that pre-sets suggested uplift lines (e.g. higher for client-placed or contract-dependent roles).
- [ ] **Compare multiple offers** side by side.

## Later

- [ ] Export the summary as a file users can keep (the in-app copy button works today).
- [ ] Equity / share scheme field with a vesting discount.
- [ ] Accessibility review (keyboard flow, screen reader labels on the scale bar).

## Done

- [x] P1 share and terms: Copy link (figures in the URL fragment, notes excluded, restore your own figures), Terms and risk question group, one-off payments with a year-one line.
- [x] P1 time value: working days and contracted hours per side, holiday compared in weeks off, full-time-equivalent salary, all-in hourly rate, optional £ value for commute time.
- [x] P0 tax accuracy: your own pension and employer matching, salary sacrifice (with NI pass-back and the 2029 cap note), student loans, monthly take-home change, and warnings for the £100k taper, Child Benefit charge and childcare. Engine moved to `assets/calc.js` with unit tests.
- [x] Guide page (`guide.html`) with narrated walkthrough video, field-by-field instructions and verdict guide; linked from the app header.
- [x] v1: current vs offer inputs, 12 recruiter questions with notes, decision lines, base-needed table, copyable summary.
