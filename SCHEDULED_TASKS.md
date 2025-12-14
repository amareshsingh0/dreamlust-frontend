# Scheduled Tasks Setup Guide

This guide explains how to set up scheduled tasks for the Dreamlust platform, including account deletion processing.

## Account Deletion Processing

The account deletion script should run daily to process pending account deletions after their 30-day grace period.

### Windows (Task Scheduler)

#### Option 1: Using Task Scheduler GUI

1. **Open Task Scheduler**
   - Press `Win + R`, type `taskschd.msc`, and press Enter
   - Or search for "Task Scheduler" in the Start menu

2. **Create Basic Task**
   - Click "Create Basic Task" in the right panel
   - Name: `Dreamlust Account Deletion Processing`
   - Description: `Processes pending account deletions after 30-day grace period`

3. **Set Trigger**
   - Trigger: Daily
   - Start: `2:00:00 AM` (or your preferred time)
   - Recur every: `1 days`

4. **Set Action**
   - Action: Start a program
   - Program/script: `powershell.exe`
   - Add arguments: `-ExecutionPolicy Bypass -File "C:\desktop\dreamlust-project\backend\scripts\scheduleAccountDeletion.ps1"`
   - Start in: `C:\desktop\dreamlust-project\backend`

5. **Finish**
   - Check "Open the Properties dialog for this task when I click Finish"
   - In Properties:
     - General tab: Check "Run whether user is logged on or not"
     - Settings tab: 
       - Check "Allow task to be run on demand"
       - Check "Run task as soon as possible after a scheduled start is missed"
       - Set "If the task fails, restart every" to `1 hour` with up to `3` attempts

#### Option 2: Using PowerShell (Run as Administrator)

```powershell
# Create the scheduled task
$action = New-ScheduledTaskAction -Execute "powershell.exe" `
    -Argument "-ExecutionPolicy Bypass -File `"C:\desktop\dreamlust-project\backend\scripts\scheduleAccountDeletion.ps1`""

$trigger = New-ScheduledTaskTrigger -Daily -At "2:00 AM"

$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" `
    -LogonType S4U -RunLevel Highest

$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RestartCount 3 `
    -RestartInterval (New-TimeSpan -Hours 1)

Register-ScheduledTask `
    -TaskName "Dreamlust Account Deletion Processing" `
    -Action $action `
    -Trigger $trigger `
    -Principal $principal `
    -Settings $settings `
    -Description "Processes pending account deletions after 30-day grace period"
```

#### Option 3: Using Task Scheduler XML (Import)

1. Save the following as `account-deletion-task.xml`:

```xml
<?xml version="1.0" encoding="UTF-16"?>
<Task version="1.2" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
  <RegistrationInfo>
    <Date>2024-01-01T00:00:00</Date>
    <Author>Dreamlust Platform</Author>
    <Description>Processes pending account deletions after 30-day grace period</Description>
  </RegistrationInfo>
  <Triggers>
    <CalendarTrigger>
      <StartBoundary>2024-01-01T02:00:00</StartBoundary>
      <Enabled>true</Enabled>
      <ScheduleByDay>
        <DaysInterval>1</DaysInterval>
      </ScheduleByDay>
    </CalendarTrigger>
  </Triggers>
  <Principals>
    <Principal id="Author">
      <UserId>S-1-5-18</UserId>
      <RunLevel>HighestAvailable</RunLevel>
    </Principal>
  </Principals>
  <Settings>
    <MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy>
    <DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries>
    <StopIfGoingOnBatteries>false</StopIfGoingOnBatteries>
    <AllowHardTerminate>true</AllowHardTerminate>
    <StartWhenAvailable>true</StartWhenAvailable>
    <RunOnlyIfNetworkAvailable>false</RunOnlyIfNetworkAvailable>
    <IdleSettings>
      <StopOnIdleEnd>false</StopOnIdleEnd>
      <RestartOnIdle>false</RestartOnIdle>
    </IdleSettings>
    <AllowStartOnDemand>true</AllowStartOnDemand>
    <Enabled>true</Enabled>
    <Hidden>false</Hidden>
    <RunOnlyIfIdle>false</RunOnlyIfIdle>
    <WakeToRun>false</WakeToRun>
    <ExecutionTimeLimit>PT1H</ExecutionTimeLimit>
    <Priority>7</Priority>
    <RestartOnFailure>
      <Interval>PT1H</Interval>
      <Count>3</Count>
    </RestartOnFailure>
  </Settings>
  <Actions Context="Author">
    <Exec>
      <Command>powershell.exe</Command>
      <Arguments>-ExecutionPolicy Bypass -File "C:\desktop\dreamlust-project\backend\scripts\scheduleAccountDeletion.ps1"</Arguments>
      <WorkingDirectory>C:\desktop\dreamlust-project\backend</WorkingDirectory>
    </Exec>
  </Actions>
</Task>
```

2. Import the task:
```powershell
schtasks /create /tn "Dreamlust Account Deletion Processing" /xml "account-deletion-task.xml"
```

### Linux/Mac (Cron)

For Linux or Mac systems, use cron:

```bash
# Edit crontab
crontab -e

# Add this line (runs daily at 2 AM)
0 2 * * * cd /path/to/backend && /usr/local/bin/bun run src/scripts/processDeletions.ts >> /path/to/backend/logs/account-deletion.log 2>&1
```

### Manual Execution

You can also run the script manually:

```powershell
# Windows PowerShell
cd C:\desktop\dreamlust-project\backend
bun run src/scripts/processDeletions.ts
```

```bash
# Linux/Mac
cd /path/to/backend
bun run src/scripts/processDeletions.ts
```

### Verification

To verify the scheduled task is working:

1. **Check Task Status** (Windows):
   ```powershell
   Get-ScheduledTask -TaskName "Dreamlust Account Deletion Processing"
   ```

2. **Run Task Manually** (Windows):
   ```powershell
   Start-ScheduledTask -TaskName "Dreamlust Account Deletion Processing"
   ```

3. **Check Logs**:
   - Logs are written to `backend/logs/account-deletion.log`
   - Check the file for execution timestamps and results

### Troubleshooting

#### Task Not Running

1. **Check Task History**:
   - Open Task Scheduler
   - Find your task
   - Click "History" tab to see execution logs

2. **Check Permissions**:
   - Ensure the task runs with appropriate permissions
   - For system-level tasks, use "Run whether user is logged on or not"

3. **Check Paths**:
   - Verify all paths in the script are correct
   - Use absolute paths instead of relative paths

4. **Test Script Manually**:
   ```powershell
   cd C:\desktop\dreamlust-project\backend
   bun run src/scripts/processDeletions.ts
   ```

#### Script Errors

- Check the console output for error messages
- Verify `DATABASE_URL` is set correctly in `.env`
- Ensure Prisma Client is generated: `bun run db:generate`
- Check database connectivity

### Production Deployment

For production environments, consider:

1. **Use a Process Manager** (PM2, systemd, etc.)
2. **Set up Monitoring** (alert on failures)
3. **Add Logging** (structured logging to a log aggregation service)
4. **Use a Job Queue** (Bull, Agenda, etc.) for more complex scheduling
5. **Database Connection Pooling** (ensure connections are properly managed)

### Alternative: Job Queue System

For more robust scheduling, consider using a job queue system:

- **Bull** (Redis-based)
- **Agenda** (MongoDB-based)
- **node-cron** (in-process scheduling)

Example with node-cron:

```typescript
import cron from 'node-cron';
import { scheduleAccountDeletionProcessing } from './lib/accountDeletion';

// Run daily at 2 AM
cron.schedule('0 2 * * *', async () => {
  console.log('Running account deletion processing...');
  await scheduleAccountDeletionProcessing();
});
```

---

## Summary

- **Windows**: Use Task Scheduler (GUI, PowerShell, or XML import)
- **Linux/Mac**: Use cron
- **Manual**: Run `bun run src/scripts/processDeletions.ts`
- **Verification**: Check task status and logs
- **Production**: Consider job queue systems for better reliability

