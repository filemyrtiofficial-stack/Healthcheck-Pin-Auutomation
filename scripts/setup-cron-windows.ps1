# PowerShell script to set up Task Scheduler for Windows
# This creates a scheduled task that runs every hour

$ScriptPath = Split-Path -Parent $PSScriptRoot
$NodePath = (Get-Command node -ErrorAction SilentlyContinue).Source

if (-not $NodePath) {
    Write-Host "Error: Node.js is not installed or not in PATH" -ForegroundColor Red
    exit 1
}

$TaskName = "RTI-HealthCheck-Automation"
$ScriptFile = Join-Path $ScriptPath "src\index.js"
$LogFile = Join-Path $ScriptPath "logs\scheduler.log"

# Remove existing task if it exists
$existingTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($existingTask) {
    Write-Host "Removing existing task..." -ForegroundColor Yellow
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}

# Create the action
$Action = New-ScheduledTaskAction -Execute $NodePath -Argument "`"$ScriptFile`"" -WorkingDirectory $ScriptPath

# Create the trigger (every hour)
$Trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Hours 1) -RepetitionDuration (New-TimeSpan -Days 365)

# Create the principal (run as current user)
$Principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive

# Create the settings
$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

# Register the task
Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Principal $Principal -Settings $Settings -Description "RTI Health Check Automation - Runs every hour"

Write-Host "Scheduled task successfully created!" -ForegroundColor Green
Write-Host "Task Name: $TaskName" -ForegroundColor Cyan
Write-Host "Runs: Every hour" -ForegroundColor Cyan
Write-Host ""
Write-Host "To view the task, run: Get-ScheduledTask -TaskName $TaskName" -ForegroundColor Yellow
Write-Host "To remove the task, run: Unregister-ScheduledTask -TaskName $TaskName -Confirm:`$false" -ForegroundColor Yellow
Write-Host ""
Write-Host "Logs will be written to: $LogFile" -ForegroundColor Cyan



