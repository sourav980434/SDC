Set WshShell = CreateObject("WScript.Shell")
If WScript.Arguments.Count > 0 Then
    cmd = WScript.Arguments(0)
    WshShell.Run cmd, 0, False
End If
