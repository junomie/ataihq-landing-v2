# Crops the ATAI wordmark to its visible (non-transparent) bounding box.
# Strategy: find the bbox on the small 256px copy (fast), scale the
# coordinates up, crop the 4096px original (sharp), resize to web size.

Add-Type -AssemblyName System.Drawing

$thumbPath = "C:\Users\lapto\OneDrive\Desktop\PROJECTS PERSONAL\ATAIHQ-LANDING-V2\images\ATAI-logo-trans.png"
$originalPath = "C:\Users\lapto\OneDrive\Desktop\ATAIHQ-WEBSITE\images\ATAI-logo-trans.png"
$outPath = "C:\Users\lapto\OneDrive\Desktop\PROJECTS PERSONAL\ATAIHQ-LANDING-V2\images\ATAI-logo-trans-cropped.png"

$ALPHA_THRESHOLD = 16   # ignore near-invisible pixels
$TARGET_WIDTH = 480     # retina headroom for ~150px navbar display

# --- 1. Find alpha bounding box on the 256px thumbnail ---
$thumb = New-Object System.Drawing.Bitmap($thumbPath)
$minX = $thumb.Width; $minY = $thumb.Height; $maxX = 0; $maxY = 0
for ($y = 0; $y -lt $thumb.Height; $y++) {
    for ($x = 0; $x -lt $thumb.Width; $x++) {
        if ($thumb.GetPixel($x, $y).A -gt $ALPHA_THRESHOLD) {
            if ($x -lt $minX) { $minX = $x }
            if ($x -gt $maxX) { $maxX = $x }
            if ($y -lt $minY) { $minY = $y }
            if ($y -gt $maxY) { $maxY = $y }
        }
    }
}
$thumbW = $thumb.Width
$thumb.Dispose()
Write-Output "Thumb bbox: x $minX-$maxX, y $minY-$maxY (of $thumbW)"

# --- 2. Scale bbox to the 4096px original, with a small safety margin ---
$original = [System.Drawing.Image]::FromFile($originalPath)
$scale = $original.Width / $thumbW
$pad = [int](2 * $scale)
$cropX = [Math]::Max(0, [int]($minX * $scale) - $pad)
$cropY = [Math]::Max(0, [int]($minY * $scale) - $pad)
$cropW = [Math]::Min($original.Width - $cropX, [int](($maxX - $minX + 1) * $scale) + 2 * $pad)
$cropH = [Math]::Min($original.Height - $cropY, [int](($maxY - $minY + 1) * $scale) + 2 * $pad)
Write-Output "Original crop: $cropX,$cropY ${cropW}x${cropH}"

# --- 3. Crop and resize in one DrawImage pass ---
$outW = $TARGET_WIDTH
$outH = [int]($cropH * $outW / $cropW)
$bmp = New-Object System.Drawing.Bitmap($outW, $outH, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$destRect = New-Object System.Drawing.Rectangle(0, 0, $outW, $outH)
$srcRect = New-Object System.Drawing.Rectangle($cropX, $cropY, $cropW, $cropH)
$g.DrawImage($original, $destRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
$g.Dispose()
$original.Dispose()
$bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()

Get-Item $outPath | Select-Object Name, Length
Write-Output "Output: ${outW}x${outH}"
