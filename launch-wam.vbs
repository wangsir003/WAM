Set oShell = CreateObject("WScript.Shell")
oShell.CurrentDirectory = "D:\AWorkProject\mytools\WAM"
oShell.Run "cmd /c npm run electron:dev", 0, False
