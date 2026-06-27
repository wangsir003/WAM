# 创建 WAM 快捷方式到桌面
$WshShell = New-Object -comObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("$env:USERPROFILE\Desktop\WAM.lnk")
$Shortcut.TargetPath = "$PSScriptRoot\launch-wam.vbs"
$Shortcut.WorkingDirectory = "$PSScriptRoot"
$Shortcut.IconLocation = "$PSScriptRoot\build\icon.ico"
$Shortcut.Description = "Windows Android-project Manager"
$Shortcut.Save()

Write-Host "✓ 快捷方式已创建到桌面！" -ForegroundColor Green
Write-Host "  现在可以将它拖到任务栏固定" -ForegroundColor Yellow
