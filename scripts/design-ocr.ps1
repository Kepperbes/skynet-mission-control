# Skynet Mission Control — Windows local OCR helper
# Uses the Windows-native Windows.Media.Ocr engine (built into Windows 10/11)
# so image text never leaves the machine and no third-party OCR binary is
# required. Mirrors the macOS Apple Vision helper (scripts/design-ocr.m):
# reads one image path, prints recognized lines to stdout, one per line.
param([Parameter(Mandatory = $true)][string]$ImagePath)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $ImagePath -PathType Leaf)) {
    [Console]::Error.WriteLine("image not found: $ImagePath")
    exit 2
}

Add-Type -AssemblyName System.Runtime.WindowsRuntime | Out-Null

# Load the WinRT types this script needs. Each must be activated from the
# Windows metadata (ContentType = WindowsRuntime) before use.
$null = [Windows.Storage.StorageFile, Windows.Storage, ContentType = WindowsRuntime]
$null = [Windows.Storage.Streams.IRandomAccessStream, Windows.Storage.Streams, ContentType = WindowsRuntime]
$null = [Windows.Graphics.Imaging.BitmapDecoder, Windows.Graphics.Imaging, ContentType = WindowsRuntime]
$null = [Windows.Graphics.Imaging.SoftwareBitmap, Windows.Graphics.Imaging, ContentType = WindowsRuntime]
$null = [Windows.Media.Ocr.OcrEngine, Windows.Foundation, ContentType = WindowsRuntime]
$null = [Windows.Media.Ocr.OcrResult, Windows.Foundation, ContentType = WindowsRuntime]
$null = [Windows.Globalization.Language, Windows.Globalization, ContentType = WindowsRuntime]

# Await a WinRT IAsyncOperation<T> from Windows PowerShell (5.1). Find the
# AsTask extension overload that takes a single IAsyncOperation`1, then block
# on the resulting .NET Task and return its Result.
function Await-WinRT {
    param(
        [Parameter(Mandatory = $true)]$AsyncOp,
        [Parameter(Mandatory = $true)][Type]$ResultType
    )
    $asTask = [System.WindowsRuntimeSystemExtensions].GetMethods() |
        Where-Object {
            $_.Name -eq "AsTask" -and
            $_.GetParameters().Count -eq 1 -and
            $_.GetParameters()[0].ParameterType.Name -eq "IAsyncOperation``1"
        } | Select-Object -First 1
    if (-not $asTask) { throw "AsTask(IAsyncOperation<T>) not found" }
    $generic = $asTask.MakeGenericMethod($ResultType)
    $task = $generic.Invoke($null, @($AsyncOp))
    $task.Wait() | Out-Null
    return $task.Result
}

try {
    $file = Await-WinRT ([Windows.Storage.StorageFile]::GetFileFromPathAsync($ImagePath)) ([Windows.Storage.StorageFile])
    $stream = Await-WinRT ($file.OpenAsync([Windows.Storage.FileAccessMode]::Read)) ([Windows.Storage.Streams.IRandomAccessStream])
    $decoder = Await-WinRT ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)) ([Windows.Graphics.Imaging.BitmapDecoder])
    $bitmap = Await-WinRT ($decoder.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])

    $engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
    if (-not $engine) {
        $engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage([Windows.Globalization.Language]::new("en-US"))
    }
    if (-not $engine) {
        [Console]::Error.WriteLine("no OCR engine available for the current language")
        exit 5
    }

    $result = Await-WinRT ($engine.RecognizeAsync($bitmap)) ([Windows.Media.Ocr.OcrResult])
    $result.Lines | ForEach-Object { $_.Text }
}
catch {
    [Console]::Error.WriteLine($_.Exception.Message)
    exit 6
}
