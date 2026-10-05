param(
  [Parameter(Mandatory = $true)]
  [string]$ScriptPath
)

adb push $ScriptPath /sdcard/hc-monkey.txt | Out-Host
adb shell monkey -f /sdcard/hc-monkey.txt 1 | Out-Host
