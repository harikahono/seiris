# HANDOFF: SEIRIS Pusher Realtime Issue

## Summary

Realtime features (toast notifications, live equity updates) **DO NOT WORK** despite:
- ✅ Pusher credentials configured correctly
- ✅ WebSocket connections established (101 Switching Protocols)
- ✅ Backend broadcasts events correctly
- ✅ No backend errors

## Root Cause

**React Strict Mode causes WebSocket corruption** via double-invoke of useEffect hooks.

### Evidence
```
doubleInvokeEffectsOnFiber @ react_dom_client.js
recursivelyTraverseAndDoubleInvokeEffectsInDEV @ react_dom_client.js
```

### Timeline of Failure
```
1. useEffect runs → state = "connecting" → Pusher starts connecting
2. React Strict Mode unmounts → cleanup scheduled (100ms debounce)
3. React Strict Mode remounts → NEW useEffect starts BUT:
   - connectionStateRef is still "connecting" → guard SKIPS (good)
   - BUT: first connection attempt is still in-flight
4. 100ms passes → cleanup() disconnects the IN-FLIGHT connection
5. React renders → but connection was aborted
6. Next render → useEffect runs again → new connection starts
7. Cycle repeats → WebSocket never establishes stable connection
```

## What We've Tried

### 1. Channel Name Fix ✅
- Changed `presence-team.{id}` → `team.{id}` (matches backend)
- No improvement

### 2. Members.parse() Fix ✅
- Changed `members.each()` → `Object.values(members).forEach()`
- Fixed crash but didn't solve realtime issue

### 3. Comprehensive Logging in ApprovalController ✅
Added logging at every step of broadcast() call:
```php
Log::info('[ApprovalController] Status APPROVED, attempting broadcast', [...]);
Log::info('[ApprovalController] Snapshot fetched', [...]);
Log::info('[ApprovalController] Broadcasting EquityUpdated event', [...]);
broadcast(new EquityUpdated($team, $snapshot))->toOthers();
Log::info('[ApprovalController] Broadcast called successfully');
```
- Logs confirm broadcast() IS being called
- But events never reach frontend

### 4. Current usePusher.ts (Pushed)
```typescript
// Has connection state guard (idle/connecting/connected/disconnected)
// Has debounced cleanup (100ms)
// Has duplicate connection prevention
// Still doesn't work
```

## Current State

| File | Content | Status |
|------|---------|--------|
| `usePusher.ts` | Connection state guard + debounced cleanup | ✅ Pushed |
| `ApprovalController.php` | Comprehensive logging | ✅ Pushed |
| `ContributionsTab.tsx` | Fix contribution list refresh | ✅ Pushed |
| `main.tsx` | StrictMode enabled | ⚠️ Potential issue |

## Files to Fix

### 1. `main.tsx` — Remove StrictMode (QUICK TEST)
```tsx
// Change from:
<StrictMode>
  <App />
</StrictMode>

// To:
// <StrictMode>
  <App />
// </>
```

### 2. `usePusher.ts` — Aggressive Fix Options

**Option A: Immediate Cleanup (no debounce)**
- Remove 100ms debounce on cleanup
- Disconnect immediately

**Option B: Check Pusher Internal State**
- Use `pusher.connection.state` before creating new instance
- Only connect if state is 'disconnected'

**Option C: Both A + B**

## Key Files

### Backend
- `seiris-be/app/Http/Controllers/Api/ApprovalController.php` (lines 103-137)
  - Broadcast call with logging
- `seiris-be/app/Events/EquityUpdated.php` - Event configuration
- `seiris-be/config/broadcasting.php` - Pusher config
- `seiris-be/routes/channels.php` - Channel authorization

### Frontend
- `seiris-fe/src/hooks/usePusher.ts` - Pusher subscription hook
- `seiris-fe/src/main.tsx` - React StrictMode
- `seiris-fe/src/components/teams/ContributionsTab.tsx` - Uses usePusher
- `seiris-fe/src/pages/DashboardPage.tsx` - Uses usePusher

## Test Procedure

1. **Test with StrictMode disabled**
   - Edit `main.tsx` to comment out StrictMode
   - Hard refresh (Ctrl+Shift+R)
   - Vote contribution to APPROVED
   - Check WS tab for `equity.updated` event
   - Check if toast appears

2. **Verify backend logs**
   ```powershell
   Get-Content seiris-be\storage\logs\laravel.log -Tail 30
   ```
   Should see:
   - `[ApprovalController] Status APPROVED, attempting broadcast`
   - `[ApprovalController] Broadcast called successfully`

3. **Verify WS in DevTools**
   - Network → WS filter
   - Look for: `{"event":"equity.updated","data":...}`

## Environment

- **Backend**: Laravel 12, PHP 8.4, PostgreSQL
- **Frontend**: React 19, Vite 8, TypeScript, Tailwind 4
- **Pusher**: App ID 2128369, Cluster ap1
- **Queue**: sync (not using queue)
- **Broadcast**: pusher

## Questions to Answer

1. Does disabling StrictMode fix the issue?
2. Is the WebSocket connection stable after StrictMode removal?
3. Does the `equity.updated` event appear in WS tab?

## Next Steps

1. **Quick Test**: Remove StrictMode from main.tsx
2. **If that works**: Fix usePusher.ts with better state management
3. **If not**: Investigate Pusher app settings or network issues