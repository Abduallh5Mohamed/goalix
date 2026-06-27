# Goalix load test

This test creates up to 10,000 isolated `player` identities whose usernames
start with `goalix_lt_<run-id>_`. It creates matching IAM memberships, roles,
JWT access sessions, and synthetic benchmark IP addresses. The local generator
also shards sockets over 16 loopback addresses so a 10,000-request burst is not
limited by one Windows ephemeral-port pool.

The runner sends synchronized authenticated request bursts to:

- `/api/v1/auth/me`
- `/api/v1/notifications/unread-count`
- `/api/v1/academy/branches`
- `/api/v1/chat/conversations`

Every run cleans its own identities in a `finally` block and verifies that the
count and ID fingerprint of all pre-existing users is unchanged.

The default `preconnected` mode ramps TCP connection establishment in small
batches, then releases all HTTP requests simultaneously. Use
`--connection-mode=agent` when intentionally testing a same-millisecond TCP
connection storm as well.

By default the runner also warms the Redis session cache, matching users who
already logged in. Add `--warm-session-cache=false` to measure a cold cache.

```powershell
node load-tests/load-test.js --users=10000 --targets=http://127.0.0.1:3000,http://127.0.0.1:3001
```

Emergency cleanup for interrupted runs:

```powershell
node load-tests/cleanup.js --confirm=DELETE_GOALIX_LOAD_USERS
```

JSON reports are written to the repository's ignored `.tmp/load-tests` folder.
