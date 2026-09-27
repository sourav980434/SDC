Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

rootDir = fso.GetAbsolutePathName(WScript.Arguments(0))

' Arguments 2 and 3 (from start-app.bat): 1 = start backend / frontend, 0 = already running, skip
runBackend = True
runFrontend = True
If WScript.Arguments.Count > 1 Then runBackend = (WScript.Arguments(1) <> "0")
If WScript.Arguments.Count > 2 Then runFrontend = (WScript.Arguments(2) <> "0")

' Set PATH for PHP (backend requires PHP 8.4)
' Priority: PHP_BIN env var > D:\php84 > C:\php84 > XAMPP
phpEnvPath = WshShell.Environment("PROCESS")("PATH")
phpBin = WshShell.Environment("PROCESS")("PHP_BIN")
phpDir = ""
If phpBin <> "" And fso.FileExists(phpBin & "\php.exe") Then
    phpDir = phpBin
ElseIf fso.FileExists("D:\php84\php.exe") Then
    phpDir = "D:\php84"
ElseIf fso.FileExists("C:\php84\php.exe") Then
    phpDir = "C:\php84"
ElseIf fso.FolderExists("E:\xampp\php") Then
    phpDir = "E:\xampp\php"
ElseIf fso.FolderExists("C:\xampp\php") Then
    phpDir = "C:\xampp\php"
End If
If phpDir <> "" Then
    WshShell.Environment("PROCESS")("PATH") = phpDir & ";" & phpEnvPath
End If

' Launch Laravel API Backend in 100% Hidden Background (Window Style 0)
If runBackend Then
    WshShell.CurrentDirectory = rootDir & "\backend"
    WshShell.Run "cmd /c php artisan serve --host=0.0.0.0 --port=8000", 0, False
End If

' Launch Next.js Frontend in 100% Hidden Background (Window Style 0)
If runFrontend Then
    WshShell.CurrentDirectory = rootDir & "\frontend"
    WshShell.Run "cmd /c npm run dev", 0, False
End If
