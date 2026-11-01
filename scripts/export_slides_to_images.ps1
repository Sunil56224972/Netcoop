param(
    [string]$pptxPath = "C:\Users\sunil\Downloads\Netcoop-main\NetCoop_AI_Presentation_Final.pptx",
    [string]$outputDir = "C:\Users\sunil\Downloads\Netcoop-main\slide_renders"
)

try {
    if (-not (Test-Path $outputDir)) {
        New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
    }
    
    $ppt = New-Object -ComObject PowerPoint.Application
    # Keep it invisible or minimized
    Write-Host "Opening $pptxPath..."
    $presentation = $ppt.Presentations.Open($pptxPath, [Microsoft.Office.Core.MsoTriState]::msoTrue, [Microsoft.Office.Core.MsoTriState]::msoFalse, [Microsoft.Office.Core.MsoTriState]::msoFalse)
    
    Write-Host "Exporting slides as PNG to $outputDir..."
    $presentation.SaveAs($outputDir, 18) # 18 = ppSaveAsPNG
    
    $presentation.Close()
    $ppt.Quit()
    Write-Host "Successfully exported slides to $outputDir!"
} catch {
    Write-Host "Error: $($_.Exception.Message)"
}
