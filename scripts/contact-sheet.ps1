# Builds a labelled contact sheet of every image in a folder so they can be identified by filename.
param([string]$Src = "C:\Users\Anil\Downloads\kmb pics", [string]$Out = ".next\contact.jpg")
Add-Type -AssemblyName System.Drawing
$files = Get-ChildItem $Src -File | Sort-Object Name
$cell = 220; $cols = 6; $rows = [math]::Ceiling($files.Count / $cols)
$bmp = New-Object System.Drawing.Bitmap ($cols * $cell), ($rows * ($cell + 28))
$g = [System.Drawing.Graphics]::FromImage($bmp); $g.Clear([System.Drawing.Color]::White)
$font = New-Object System.Drawing.Font("Arial", 9)
$i = 0
foreach ($f in $files) {
  $img = [System.Drawing.Image]::FromFile($f.FullName)
  $s = [math]::Min($cell / $img.Width, $cell / $img.Height)
  $w = [int]($img.Width * $s); $h = [int]($img.Height * $s)
  $x = ($i % $cols) * $cell + [int](($cell - $w) / 2); $y = [math]::Floor($i / $cols) * ($cell + 28)
  $g.DrawImage($img, $x, $y, $w, $h); $img.Dispose()
  $label = $f.Name -replace 'WhatsApp Image 2026-10-05 at ', ''
  $g.DrawString($label, $font, [System.Drawing.Brushes]::Black, ($i % $cols) * $cell + 4, $y + $cell + 4)
  $i++
}
New-Item -ItemType Directory -Force (Split-Path $Out) | Out-Null
$bmp.Save((Join-Path (Get-Location) $Out), [System.Drawing.Imaging.ImageFormat]::Jpeg)
"Saved $Out"
