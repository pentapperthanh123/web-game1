@echo off
rem Installs Microsoft Edge neural TTS (HoaiMy / NamMinh) for the AI caster into server\.tts-venv.
rem Re-run with --upgrade after Microsoft changes the service: setup-edge-tts.bat --upgrade
cd /d "%~dp0\..\..\server"
if not exist ".tts-venv\Scripts\python.exe" (
  echo Creating server\.tts-venv ...
  python -m venv .tts-venv || goto :fail
)
".tts-venv\Scripts\python.exe" -m pip install --quiet %1 edge-tts || goto :fail
".tts-venv\Scripts\python.exe" -m edge_tts --version
echo Edge TTS ready. Restart the server to use it.
exit /b 0
:fail
echo Edge TTS setup failed. The caster keeps using the fallback voice.
exit /b 1
