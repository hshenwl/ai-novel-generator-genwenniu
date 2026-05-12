; AI Novel Studio Installer
; NSIS 3.x Script

!include "MUI2.nsh"

Name "AI Novel Studio"
OutFile "AI-Novel-Studio-Setup.exe"
InstallDir "$LOCALAPPDATA\AI-Novel-Studio"
InstallDirRegKey HKCU "Software\AI-Novel-Studio" ""
RequestExecutionLevel admin
SetCompressor /SOLID lzma

; MUI Settings
!define MUI_ABORTWARNING

; Pages
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

!insertmacro MUI_LANGUAGE "SimpChinese"

Section "Install"
  SetOutPath "$INSTDIR"
  File /r "FILES\*.*"

  CreateDirectory "$INSTDIR\data"
  CreateDirectory "$INSTDIR\data\uploads"
  CreateDirectory "$INSTDIR\data\backups"

  ; Run post-install setup
  ExecWait 'cmd /c "$INSTDIR\setup.bat"'

  ; Uninstaller
  WriteUninstaller "$INSTDIR\Uninstall.exe"

  ; Registry
  WriteRegStr HKCU "Software\AI-Novel-Studio" "InstallDir" "$INSTDIR"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\AI-Novel-Studio" "DisplayName" "AI Novel Studio"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\AI-Novel-Studio" "UninstallString" '"$INSTDIR\Uninstall.exe"'
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\AI-Novel-Studio" "Publisher" "AI Novel Studio"
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\AI-Novel-Studio" "NoModify" 1
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\AI-Novel-Studio" "NoRepair" 1
SectionEnd

Section "Uninstall"
  nsExec::ExecToLog 'cmd /c "for /f "tokens=5" %a in (''netstat -ano | findstr ":18765 " | findstr LISTENING'') do taskkill /F /PID %a 2>nul"'
  RMDir /r "$INSTDIR"
  Delete "$DESKTOP\AI Novel Studio.lnk"
  RMDir /r "$SMPROGRAMS\AI Novel Studio"
  DeleteRegKey HKCU "Software\AI-Novel-Studio"
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\AI-Novel-Studio"
SectionEnd
