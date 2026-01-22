; Azure Management App NSIS Installer Script

!macro customHeader
  ; Custom header for the installer
!macroend

!macro preInit
  ; Pre-initialization
  SetRegView 64
!macroend

!macro customInit
  ; Custom initialization
!macroend

!macro customInstall
  ; Custom install steps - create config directory
  CreateDirectory "$APPDATA\${APP_FILENAME}"
!macroend

!macro customUnInstall
  ; Custom uninstall steps
  ; Remove config directory if empty
  RMDir "$APPDATA\${APP_FILENAME}"
!macroend
