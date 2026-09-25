@echo off
REM Sets REPO_ROOT to the DataCenterSmartPower repo (parent of Start\).
for %%I in ("%~dp0..") do set "REPO_ROOT=%%~fI"
