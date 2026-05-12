; ============================================================
; AI Novel Studio - Inno Setup 安装器脚本
; 使用方法: 用Inno Setup Compiler编译此文件
; 下载: https://jrsoftware.org/isdl.php
; ============================================================

#define AppName "AI小说创作系统"
#define AppVersion "1.4.8"
#define AppPublisher "MuMuAINovel"
#define AppURL "https://github.com/mumu-ai/ai-novel-studio"
#define AppExeName "启动.bat"

[Setup]
AppId={{A1B2C3D4-E5F6-7890-ABCD-EF1234567890}
AppName={#AppName}
AppVersion={#AppVersion}
AppPublisher={#AppPublisher}
AppPublisherURL={#AppURL}
DefaultDirName={autopf}\{#AppName}
DefaultGroupName={#AppName}
AllowNoIcons=yes
OutputDir=..\..\dist-installer
OutputBaseFilename=AI小说创作系统_Setup_v{#AppVersion}
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=admin
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible

; 安装后自动启动
[Languages]
Name: "chinesesimplified"; MessagesFile: "compiler:Languages\ChineseSimplified.isl"

[Tasks]
Name: "desktopicon"; Description: "创建桌面快捷方式"; GroupDescription: "附加图标:"
Name: "startmenuicon"; Description: "创建开始菜单快捷方式"; GroupDescription: "附加图标:"

[Files]
; 后端服务
Source: "..\..\dist\server\*"; DestDir: "{app}\server"; Flags: ignoreversion recursesubdirs createallsubdirs

; 前端静态文件
Source: "..\..\dist\web\*"; DestDir: "{app}\web"; Flags: ignoreversion recursesubdirs createallsubdirs

; Prisma
Source: "..\..\dist\prisma\*"; DestDir: "{app}\prisma"; Flags: ignoreversion recursesubdirs createallsubdirs

; node_modules
Source: "..\..\dist\node_modules\*"; DestDir: "{app}\node_modules"; Flags: ignoreversion recursesubdirs createallsubdirs

; 资源文件
Source: "..\..\dist\resources\*"; DestDir: "{app}\resources"; Flags: ignoreversion recursesubdirs createallsubdirs

; 知识库
Source: "..\..\dist\knowledge\*"; DestDir: "{app}\knowledge"; Flags: ignoreversion recursesubdirs createallsubdirs

; Python API
Source: "..\..\dist\api\*"; DestDir: "{app}\api"; Flags: ignoreversion recursesubdirs createallsubdirs

; 配置文件
Source: "..\..\dist\.env"; DestDir: "{app}"; Flags: ignoreversion onlyifdoesntexist

; 启动脚本
Source: "..\..\dist\start.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\..\dist\stop.bat"; DestDir: "{app}"; Flags: ignoreversion

[Dirs]
Name: "{app}\data"; Permissions: everyone-full
Name: "{app}\data\uploads"; Permissions: everyone-full
Name: "{app}\data\backups"; Permissions: everyone-full

[Icons]
Name: "{group}\{#AppName}"; Filename: "{app}\{#AppExeName}"; WorkingDir: "{app}"; Tasks: startmenuicon
Name: "{group}\停止服务"; Filename: "{app}\stop.bat"; WorkingDir: "{app}"; Tasks: startmenuicon
Name: "{autodesktop}\{#AppName}"; Filename: "{app}\{#AppExeName}"; WorkingDir: "{app}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#AppExeName}"; Description: "立即启动 {#AppName}"; Flags: nowait postinstall skipifsilent

[Code]
// 在安装完成后初始化数据库
procedure CurStepChanged(CurStep: TSetupStep);
var
  ResultCode: Integer;
  NodePath: string;
  PrismaPath: string;
begin
  if CurStep = ssPostInstall then
  begin
    // 生成JWT密钥并写入.env
    NodePath := ExpandConstant('{app}\node_modules\node');
    
    // 初始化数据库
    PrismaPath := ExpandConstant('{app}\node_modules\prisma\build\index.js');
    if FileExists(PrismaPath) then
    begin
      Exec('node', PrismaPath + ' db push --accept-data-loss --schema=' + ExpandConstant('{app}\prisma\schema.prisma') + ' --skip-generate',
           ExpandConstant('{app}'), SW_HIDE, ewWaitUntilTerminated, ResultCode);
      Exec('node', PrismaPath + ' generate --schema=' + ExpandConstant('{app}\prisma\schema.prisma'),
           ExpandConstant('{app}'), SW_HIDE, ewWaitUntilTerminated, ResultCode);
    end;
  end;
end;
