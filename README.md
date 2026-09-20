# AC-ITS E-Comic V11 Build Fix

Replace:
`src/services/firebaseService.js`

Reason:
V11 imported `auth` and `db` from firebaseService.js, but the V11 file did not export those bindings. This caused Vercel/Rollup build error:
`"db" is not exported by "src/services/firebaseService.js"`.

This patch restores the named exports:
`app`, `auth`, `db`, `storage`.

No anonymous authentication is re-enabled. Firebase Auth remains the source of truth.
