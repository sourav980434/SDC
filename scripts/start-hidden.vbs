Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

rootDir = fso.GetAbsolutePathName(WScript.Arguments(0))

' Set PATH for XAMPP PHP
phpEnvPath = WshShell.Environment("PROCESS")("PATH")
If fso.FolderExists("E:\xampp\php") Then
    WshShell.Environment("PROCESS")("PATH") = "E:\xampp\php;" & phpEnvPath
ElseIf fso.FolderExists("C:\xampp\php") Then
    WshShell.Environment("PROCESS")("PATH") = "C:\xampp\php;" & phpEnvPath
End If

' Launch Laravel API Backend in 100% Hidden Background (Window Style 0)
WshShell.CurrentDirectory = rootDir & "\backend"
WshShell.Run "cmd /c php artisan serve --host=0.0.0.0 --port=8000", 0, False

' Launch Next.js Frontend in 100% Hidden Background (Window Style 0)
WshShell.CurrentDirectory = rootDir & "\frontend"
WshShell.Run "cmd /c npm run dev", 0, False
