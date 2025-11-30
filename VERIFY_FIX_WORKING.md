# How to Verify the Task Permissions Fix is Working

## Quick Test (2 minutes)

After Lovable deploys the migration, follow this simple test:

### ✅ Test 1: Can You See Boards?
1. Navigate to Projects page (`/tasks/projects`)
2. **Expected:** See a list of project boards
3. **If fails:** Migration not applied yet, or task_boards policies missing

### ✅ Test 2: Can You See Lists?
1. Click on any board
2. **Expected:** See lists like "To Do", "In Progress", "Done"
3. **If fails:** task_lists policies missing (CRITICAL)

### ✅ Test 3: Can You Create a Task?
1. Click the "+" button or "Add Task"
2. Fill in task title
3. Click Create
4. **Expected:** Task appears in the list
5. **If fails:** Check browser console (F12) for error message

### ✅ Test 4: Can You Move a Task?
1. Drag a task from one list to another
2. **Expected:** Task moves and stays in new list
3. **If fails:** tasks UPDATE policy still has transaction_id restriction

### ✅ Test 5: Can You Complete a Task?
1. Click the checkbox on a task
2. **Expected:** Task marks as complete
3. **If fails:** tasks UPDATE policy issue

## Detailed Browser Console Check

If any test fails, open Browser Console:

### How to Open Console
- **Chrome/Edge:** Press `F12` or `Ctrl+Shift+J` (Windows) / `Cmd+Option+J` (Mac)
- **Firefox:** Press `F12` or `Ctrl+Shift+K` (Windows) / `Cmd+Option+K` (Mac)
- **Safari:** Press `Cmd+Option+C`

### What to Look For

#### ✅ SUCCESS - No errors:
```
✓ Task created successfully
✓ Task updated
```

#### ❌ FAILURE - RLS Policy Errors:
```javascript
// Example errors you might see:
Error: new row violates row-level security policy for table "task_lists"
Error: permission denied for table task_lists
Error: new row violates row-level security policy for table "tasks"
```

#### ❌ FAILURE - Specific Error Messages:
```javascript
// From useTasks.tsx error handling:
"You don't have permission to move this task"
"You don't have permission to complete this task"
"Failed to create task"
"No rows were updated - you may not have permission"
```

## Step-by-Step Testing Procedure

### Setup
1. Open your application in browser
2. Open Browser Console (F12)
3. Go to Projects page

### Test Sequence

#### 1. View Boards Test
```
Action: Navigate to /tasks/projects
Expected: Boards visible
Console: No errors
Status: [ ] PASS / [ ] FAIL
```

#### 2. View Lists Test
```
Action: Click on a board
Expected: Lists visible (To Do, In Progress, Done)
Console: No errors
Status: [ ] PASS / [ ] FAIL
```

#### 3. Create Task Test
```
Action: Click "+ Add Task", enter title "Test Task", click Create
Expected: Task appears in list
Console: No "permission denied" or "row-level security" errors
Status: [ ] PASS / [ ] FAIL
```

#### 4. Move Task Test
```
Action: Drag "Test Task" from "To Do" to "In Progress"
Expected: Task moves to new list
Console: No "permission to move" errors
Status: [ ] PASS / [ ] FAIL
```

#### 5. Complete Task Test
```
Action: Click checkbox on "Test Task"
Expected: Task marked complete, checkbox checked
Console: No "permission to complete" errors
Status: [ ] PASS / [ ] FAIL
```

#### 6. View Activity Test
```
Action: Click on task to open details/drawer
Expected: Can see activity log or history
Console: No errors loading activity
Status: [ ] PASS / [ ] FAIL
```

## Interpreting Results

### All Tests Pass ✅
**Migration successfully applied!** Task permissions are fixed.
- Users can create, move, and complete tasks
- All RLS policies are working correctly

### Test 1 Fails (Can't See Boards) ❌
**Issue:** `task_boards` policies not applied
**Likely cause:** Migration hasn't run yet or failed
**Next step:** Check Lovable deployment status

### Test 2 Fails (Can't See Lists) ❌
**Issue:** `task_lists` policies not applied
**Impact:** CRITICAL - blocks all task operations
**Likely cause:** Migration hasn't run yet or failed
**Next step:** Check Lovable deployment logs

### Test 3 Fails (Can't Create Task) ❌
**Possible causes:**
1. `task_lists` policies missing (can't read lists to get valid list_id)
2. `tasks` INSERT policy issue
3. Migration not applied yet

**Debug:**
- Check console error message
- If "permission denied for table task_lists" → task_lists policies missing
- If "permission denied for table tasks" → tasks INSERT policy issue

### Test 4 Fails (Can't Move Task) ❌
**Possible causes:**
1. `tasks` UPDATE policy still has transaction_id restriction
2. `task_lists` policies missing (can't read target list)

**Debug:**
- Check console error message
- If "permission to move this task" → UPDATE policy issue
- If "permission denied" → RLS policy not applied

### Test 5 Fails (Can't Complete Task) ❌
**Possible causes:**
1. `tasks` UPDATE policy still has transaction_id restriction
2. `tasks` UPDATE policy not applied

**Debug:**
- Check console error message
- Should be same fix as Test 4

## Network Tab Debugging

For advanced debugging, use Network tab:

1. Open Browser Console (F12)
2. Go to **Network** tab
3. Try to create a task
4. Look for failed request (red)
5. Click on the failed request
6. Check **Preview** or **Response** tab
7. Look for error details

### Example Failed Request:
```json
{
  "code": "42501",
  "message": "new row violates row-level security policy for table \"task_lists\"",
  "details": null,
  "hint": null
}
```

This tells you exactly which table's RLS policy is blocking the operation.

## What Each Error Means

### Error: "new row violates row-level security policy for table 'task_lists'"
**Meaning:** No INSERT or SELECT policy on task_lists
**Status:** Migration not applied
**Fix:** Wait for Lovable deployment

### Error: "permission denied for table task_lists"
**Meaning:** No policies at all on task_lists
**Status:** Migration not applied
**Fix:** Wait for Lovable deployment

### Error: "You don't have permission to move this task"
**Meaning:** tasks UPDATE policy is blocking
**Cause:** Likely still has "AND transaction_id IS NULL"
**Fix:** Migration not applied or failed

### Error: "No rows were updated - you may not have permission"
**Meaning:** UPDATE succeeded but affected 0 rows due to RLS
**Cause:** tasks UPDATE policy USING clause too restrictive
**Fix:** Migration not applied

## Timeline Expectations

### After Merging PR:
```
T+0min:  Merge PR to main
T+1min:  Lovable detects change
T+2min:  Lovable starts deployment
T+3min:  Lovable runs migrations
T+4min:  Deployment complete
T+5min:  🧪 START TESTING (refresh browser first!)
```

### If Migrations Applied Successfully:
- All 6 tests should PASS immediately
- No console errors
- Tasks work normally

### If Migrations Not Applied Yet:
- Tests 1-6 will FAIL
- Console shows RLS policy errors
- Wait another 2-3 minutes and test again

## Refresh Browser After Deployment

**IMPORTANT:** After Lovable deploys, hard refresh your browser:
- Windows/Linux: `Ctrl + Shift + R`
- Mac: `Cmd + Shift + R`

This ensures you're running the latest code and that the frontend can access the new RLS policies.

## Summary Checklist

After Lovable deployment:
- [ ] Hard refresh browser (Ctrl+Shift+R)
- [ ] Open browser console (F12)
- [ ] Navigate to Projects page
- [ ] Run all 6 tests above
- [ ] Check console for errors
- [ ] If all pass → ✅ Fixed!
- [ ] If any fail → Check error messages and share with team

## Getting Help

If tests still fail after 10 minutes:
1. Share screenshots of browser console errors
2. Share which specific test failed
3. Confirm Lovable deployment completed successfully
4. Check if you're on the correct branch/environment
