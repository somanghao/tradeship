# 진짜 OS 마우스 커서 — 사람처럼 미끄러지듯 움직이고 클릭한다.
#   mouse.ps1 raise  <제목조각>            그 제목의 창을 맨 앞으로(항상 위) + 위치·크기 지정
#   mouse.ps1 move   <x> <y>
#   mouse.ps1 glide  <x1> <y1> <x2> <y2> <steps> <click 0|1>
param([string]$cmd, [string]$arg1, [int]$a, [int]$b, [int]$c, [int]$d, [int]$steps = 24, [int]$click = 0)

Add-Type @"
using System;
using System.Text;
using System.Runtime.InteropServices;
public class U32 {
  [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int X, int Y);
  [DllImport("user32.dll")] public static extern void mouse_event(uint f, uint dx, uint dy, uint d, int ei);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int n);
  [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr h, IntPtr after, int x, int y, int w, int ht, uint flags);
  [DllImport("user32.dll")] public static extern bool BringWindowToTop(IntPtr h);
  [DllImport("user32.dll")] static extern bool EnumWindows(D cb, IntPtr l);
  [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] static extern int GetWindowTextW(IntPtr h, StringBuilder s, int n);
  delegate bool D(IntPtr h, IntPtr l);
  public static IntPtr Find(string needle) {
    IntPtr found = IntPtr.Zero;
    EnumWindows((h, l) => {
      if (!IsWindowVisible(h)) return true;
      var sb = new StringBuilder(400);
      GetWindowTextW(h, sb, 400);
      if (sb.ToString().Contains(needle)) { found = h; return false; }
      return true;
    }, IntPtr.Zero);
    return found;
  }
}
"@
[U32]::SetProcessDPIAware() | Out-Null

if ($cmd -eq 'raise') {
  $h = [U32]::Find($arg1)
  if ($h -eq [IntPtr]::Zero) { Write-Output "not found: $arg1"; exit 1 }
  [U32]::ShowWindow($h, 9) | Out-Null                                    # SW_RESTORE
  # HWND_TOPMOST(-1)로 올린 뒤 위치·크기까지 한 번에 지정 → 다른 창 뒤로 숨지 않는다
  [U32]::SetWindowPos($h, [IntPtr](-1), 240, 40, 1400, 940, 0x0040) | Out-Null
  [U32]::BringWindowToTop($h) | Out-Null
  [U32]::SetForegroundWindow($h) | Out-Null
  Write-Output "raised"
  exit
}
if ($cmd -eq 'untop') {
  $h = [U32]::Find($arg1)
  if ($h -ne [IntPtr]::Zero) { [U32]::SetWindowPos($h, [IntPtr](-2), 0, 0, 0, 0, 0x0001 -bor 0x0002) | Out-Null }
  Write-Output "untopped"; exit
}
if ($cmd -eq 'move') { [U32]::SetCursorPos($a, $b) | Out-Null; exit }
if ($cmd -eq 'glide') {
  for ($i = 1; $i -le $steps; $i++) {
    $t = $i / [double]$steps
    $e = if ($t -lt 0.5) { 2 * $t * $t } else { 1 - [Math]::Pow(-2 * $t + 2, 2) / 2 }   # ease-in-out
    $x = [int]($a + ($c - $a) * $e)
    $y = [int]($b + ($d - $b) * $e)
    [U32]::SetCursorPos($x, $y) | Out-Null
    Start-Sleep -Milliseconds 12
  }
  if ($click -eq 1) {
    Start-Sleep -Milliseconds 220
    [U32]::mouse_event(0x0002, 0, 0, 0, 0)
    Start-Sleep -Milliseconds 85
    [U32]::mouse_event(0x0004, 0, 0, 0, 0)
  }
  exit
}
Write-Output 'usage: raise <title> | untop <title> | move x y | glide x1 y1 x2 y2 steps click'
