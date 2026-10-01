# Converts the scanned signature JPEG into a trimmed, transparent PNG for the certificate.
# Usage: powershell -File scripts/make-signature.ps1 "C:\path\to\signature.jpeg"
param([Parameter(Mandatory = $true)][string]$Source, [string]$Out = "public/signature.png")

Add-Type -AssemblyName System.Drawing
$src = [System.Drawing.Bitmap]::FromFile((Resolve-Path $Source))
$w = $src.Width; $h = $src.Height
$bmp = New-Object System.Drawing.Bitmap $w, $h, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($bmp); $g.DrawImage($src, 0, 0, $w, $h); $g.Dispose(); $src.Dispose()

$rect = New-Object System.Drawing.Rectangle 0, 0, $w, $h
$data = $bmp.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadWrite, $bmp.PixelFormat)
$bytes = New-Object byte[] ($data.Stride * $h)
[System.Runtime.InteropServices.Marshal]::Copy($data.Scan0, $bytes, 0, $bytes.Length)

$minX = $w; $minY = $h; $maxX = 0; $maxY = 0
for ($y = 0; $y -lt $h; $y++) {
  $row = $y * $data.Stride
  for ($x = 0; $x -lt $w; $x++) {
    $i = $row + $x * 4
    $b = $bytes[$i]; $gch = $bytes[$i + 1]; $r = $bytes[$i + 2]
    # Ink is blue: alpha from "how far from white" the pixel is
    $whiteness = [Math]::Min($r, [Math]::Min($gch, $b))
    $alpha = [Math]::Max(0, [Math]::Min(255, [int](((235 - $whiteness) / 75.0) * 255)))
    if ($alpha -lt 12) { $alpha = 0 }
    $bytes[$i + 3] = [byte]$alpha
    if ($alpha -gt 40) {
      if ($x -lt $minX) { $minX = $x }; if ($x -gt $maxX) { $maxX = $x }
      if ($y -lt $minY) { $minY = $y }; if ($y -gt $maxY) { $maxY = $y }
    }
  }
}
[System.Runtime.InteropServices.Marshal]::Copy($bytes, 0, $data.Scan0, $bytes.Length)
$bmp.UnlockBits($data)

$pad = 6
$crop = New-Object System.Drawing.Rectangle ([Math]::Max(0, $minX - $pad)), ([Math]::Max(0, $minY - $pad)), ([Math]::Min($w, $maxX + $pad) - [Math]::Max(0, $minX - $pad)), ([Math]::Min($h, $maxY + $pad) - [Math]::Max(0, $minY - $pad))
$trimmed = $bmp.Clone($crop, $bmp.PixelFormat)
$trimmed.Save((Join-Path (Get-Location) $Out), [System.Drawing.Imaging.ImageFormat]::Png)
"Saved $Out ($($trimmed.Width)x$($trimmed.Height))"
$trimmed.Dispose(); $bmp.Dispose()
