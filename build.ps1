$html = [System.IO.File]::ReadAllText("$PSScriptRoot\index.html", [System.Text.Encoding]::UTF8)
$css  = [System.IO.File]::ReadAllText("$PSScriptRoot\style.css", [System.Text.Encoding]::UTF8)
$js   = [System.IO.File]::ReadAllText("$PSScriptRoot\app.js", [System.Text.Encoding]::UTF8)
$svg  = [System.IO.File]::ReadAllText("$PSScriptRoot\icon.svg", [System.Text.Encoding]::UTF8)

$svgBase64 = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($svg))
$iconUri = "data:image/svg+xml;base64,$svgBase64"

# Replace icon links with data URI
$html = $html.Replace('<link rel="icon" type="image/svg+xml" href="icon.svg"/>', "<link rel=`"icon`" type=`"image/svg+xml`" href=`"$iconUri`"/>")
$html = $html.Replace('<link rel="icon" type="image/png" sizes="192x192" href="icon-192.png"/>', '')
$html = $html.Replace('<link rel="apple-touch-icon" href="icon-192.png"/>', "<link rel=`"apple-touch-icon`" href=`"$iconUri`"/>")
$html = $html.Replace('src="icon.svg"', "src=`"$iconUri`"")
$html = $html.Replace('src="icon-192.png"', "src=`"$iconUri`"")

# Inlined styles and scripts
$html = $html.Replace('<link rel="stylesheet" href="style.css"/>', "<style>`n$css`n</style>")
$html = $html.Replace('<script src="app.js"></script>', "<script>`n$js`n</script>")

[System.IO.File]::WriteAllText("$PSScriptRoot\ListDo.html", $html, [System.Text.Encoding]::UTF8)
[System.IO.File]::WriteAllText("$PSScriptRoot\ToDo.html", $html, [System.Text.Encoding]::UTF8)
Write-Output "Built ListDo.html and ToDo.html successfully!"
