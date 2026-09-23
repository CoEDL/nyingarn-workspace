# 1. Retain the `user.provider` column

## Status

Accepted

## Context

Users used to sign in with Google or AAF (OpenID Connect), or with an email login link. The `user.provider` column recorded which: `google`, `aaf`, `email`, or `unset` for accounts an administrator created before their first sign-in. Email login never updated it, so many rows still say `unset` for users who have signed in many times.

OpenID Connect has been removed. Email login links are now the only way to sign in, and it finds users by email alone, so existing Google and AAF users sign in unchanged.

The column is `NOT NULL`. The schema is managed by `sequelize.sync()`, which creates missing tables but never alters or drops columns, and there is no migration tooling.

## Decision

Keep the column. The model gives it a default of `email` and no application code sets or reads it. `api/src/scripts/merge-users.js` still prints it as context when comparing duplicate accounts.

Existing values are historical and carry no meaning. How a user signed in is recorded in the `log` table (`data.provider`).

## Consequences

- No manual production database step is needed to deploy.
- New rows get `email`. Older rows keep `google`, `aaf`, `unset` or `email`.
- If migrations are introduced, dropping the column is a good candidate for an early one.
