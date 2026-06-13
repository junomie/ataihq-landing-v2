# The "trans" logo PNGs are actually opaque with a dark checkerboard baked in.
# This keys out the dark near-greyscale background:
#   - near-greyscale + dark  -> transparent
#   - near-greyscale + mid   -> alpha ramp (anti-aliased edges)
#   - bright or colourful    -> kept
# Then crops each result to its visible bounding box.

Add-Type -AssemblyName System.Drawing

$imgDir = "C:\Users\lapto\OneDrive\Desktop\PROJECTS PERSONAL\ATAIHQ-LANDING-V2\images"

$GREY_TOLERANCE = 24   # max channel spread to count as greyscale
$DARK_CUTOFF = 85      # greyscale below this luma -> fully transparent
$RAMP_TOP = 130        # greyscale above this luma -> fully opaque

function Key-And-Crop {
    param([string]$Path, [string]$OutPath)

    $src = New-Object System.Drawing.Bitmap($Path)
    $w = $src.Width; $h = $src.Height
    $bmp = New-Object System.Drawing.Bitmap($w, $h, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)

    $minX = $w; $minY = $h; $maxX = 0; $maxY = 0
    for ($y = 0; $y -lt $h; $y++) {
        for ($x = 0; $x -lt $w; $x++) {
            $c = $src.GetPixel($x, $y)
            $maxCh = [Math]::Max($c.R, [Math]::Max($c.G, $c.B))
            $minCh = [Math]::Min($c.R, [Math]::Min($c.G, $c.B))
            $isGrey = ($maxCh - $minCh) -le $GREY_TOLERANCE
            $luma = [int](0.299 * $c.R + 0.587 * $c.G + 0.114 * $c.B)

            if ($isGrey -and $luma -lt $DARK_CUTOFF) {
                $a = 0
            } elseif ($isGrey -and $luma -lt $RAMP_TOP) {
                $a = [int](255 * ($luma - $DARK_CUTOFF) / ($RAMP_TOP - $DARK_CUTOFF))
            } else {
                $a = $c.A
            }

            if ($a -gt 8) {
                if ($x -lt $minX) { $minX = $x }
                if ($x -gt $maxX) { $maxX = $x }
                if ($y -lt $minY) { $minY = $y }
                if ($y -gt $maxY) { $maxY = $y }
            }
            $bmp.SetPixel($x, $y, [System.Drawing.Color]::FromArgb($a, $c.R, $c.G, $c.B))
        }
    }
    $src.Dispose()

    if ($maxX -lt $minX) { throw "Nothing left after keying: $Path" }
    $pad = 2
    $minX = [Math]::Max(0, $minX - $pad); $minY = [Math]::Max(0, $minY - $pad)
    $maxX = [Math]::Min($w - 1, $maxX + $pad); $maxY = [Math]::Min($h - 1, $maxY + $pad)
    $rect = New-Object System.Drawing.Rectangle($minX, $minY, ($maxX - $minX + 1), ($maxY - $minY + 1))
    $cropped = $bmp.Clone($rect, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $bmp.Dispose()
    $cropped.Save($OutPath, [System.Drawing.Imaging.ImageFormat]::Png)
    Write-Output "$([System.IO.Path]::GetFileName($OutPath)): $($cropped.Width)x$($cropped.Height)"
    $cropped.Dispose()
}

Key-And-Crop "$imgDir\ATAI-logo-trans.png" "$imgDir\ATAI-logo-keyed.png"
Key-And-Crop "$imgDir\ATAI-A-logo-trans.png" "$imgDir\ATAI-A-logo-keyed.png"

Get-ChildItem $imgDir | Select-Object Name, Length
