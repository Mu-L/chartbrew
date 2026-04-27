# Stripe Connection And Chart Templates

Status: in progress

## Goal
Add a focused Stripe connection flow and a generic chart-template system that helps users create useful dashboards immediately after connecting a data source.

## Scope
- Add a Stripe API connection form in `chartbrew-os` using API key authentication.
- Replace the post-connection modal with a routed next-steps screen.
- Add version-controlled backend chart-template files and APIs to list, preview, and instantiate templates.
- Use existing quick-create controller paths to create datasets, data requests, charts, and chart dataset configs.
- Ship the first Stripe `core-revenue` template pack.

## Out Of Scope
- Stripe OAuth.
- Editing built-in templates in the UI.
- Changes to `chartbrew-cloud`.

## Design And UI Requirements
- New UI must use the existing Chartbrew visual language, layout rhythm, dark/light behavior, and dashboard/connection patterns.
- New UI must use HeroUI v3 components from `@heroui/react` with compound component patterns.
- Use semantic variants such as `primary`, `secondary`, `tertiary`, and `danger`.
- The next step after saving a connection must be a routed screen, not another primary workflow modal.

## Backend Requirements
- Built-in chart templates are versioned files, not rows in the `Template` table.
- Template creation must validate team access, connection ownership, project ownership, selected dataset templates, and chart dependencies.
- Template creation must run in a Sequelize transaction and roll back partial datasets/charts on failure.
- Created datasets must be tagged with the selected dashboard through `project_ids`.
- The selected Stripe connection should also include the dashboard id in `project_ids`.

## Stripe Core Revenue Pack
Dataset templates:
- Payment intents
- Invoices
- Subscriptions
- Customers
- Balance transactions

Initial chart templates:
- Payment volume
- Payment status
- Paid invoices
- New customers
- Subscriptions by status
- Net revenue
- Stripe fees
- Recent transactions table

