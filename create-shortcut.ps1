$WshShell = New-Object -ComObject WScript.Shell
$DesktopPath = [System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::Desktop)
$ShortcutPath = Join-Path -Path $DesktopPath -ChildPath "SpeakX.lnk"
$TargetBat = Join-Path -Path $PSScriptRoot -ChildPath "launch-app.bat"

$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = $TargetBat
$Shortcut.WorkingDirectory = $PSScriptRoot
$Shortcut.Description = "SpeakX - AI Communication Practice App"
$Shortcut.Save()

Write-Host "===================================================" -ForegroundColor Green
Write-Host "[SUCCESS] 'SpeakX' shortcut created on your Desktop!" -ForegroundColor Green
Write-Host "Location: $ShortcutPath" -ForegroundColor Cyan
Write-Host "Double-click 'SpeakX' on your desktop anytime to start." -ForegroundColor Yellow
Write-Host "===================================================" -ForegroundColor Green
