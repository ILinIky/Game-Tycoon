param([string]$OutputPath = (Join-Path $PSScriptRoot '../src/game/data/company-market-caps.json'))
$ErrorActionPreference = 'Stop'
$culture = [Globalization.CultureInfo]::InvariantCulture
$base = 'https://companiesmarketcap.com'
$urls = @("$base/") + @(2..10 | ForEach-Object { "$base/page/$_/" }) + @("$base/video-games/largest-video-game-companies-by-market-cap/", "$base/video-games/largest-video-game-companies-by-market-cap/?page=2")
$companies = [ordered]@{}
foreach ($url in $urls) {
    $html = (Invoke-WebRequest -Uri $url -UseBasicParsing).Content
    $body = [regex]::Match($html, '(?s)<tbody>(.*?)</tbody>').Groups[1].Value
    $rows = [regex]::Matches($body, '(?s)<tr>(.*?)</tr>')
    if ($rows.Count -ne 100) { throw "Expected 100 rows from $url, got $($rows.Count). Source may have changed." }
    foreach ($row in $rows) {
        $text = $row.Groups[1].Value
        $name = [Net.WebUtility]::HtmlDecode([regex]::Match($text, 'class="company-name">([^<]+)').Groups[1].Value).Trim()
        $ticker = [regex]::Match($text, 'class="company-code">.*?</span>([^<]+)').Groups[1].Value.Trim()
        $capText = [regex]::Match($text, '<td class="td-right" data-sort="([0-9]+)">').Groups[1].Value
        $country = [regex]::Match($text, '/img/flags/([a-z]+)\.png').Groups[1].Value.ToUpperInvariant()
        if (!$country) {
            $countryName = [regex]::Match($text, 'class="responsive-hidden">([^<]+)').Groups[1].Value
            $country = @{ 'Isle of Man' = 'IM'; 'Curaçao' = 'CW'; 'Curacao' = 'CW'; 'Bermuda' = 'BM'; 'Cayman Islands' = 'KY'; 'British Virgin Islands' = 'VG'; 'Hungary' = 'HU' }[$countryName]
        }
        if ($country -eq 'UK') { $country = 'GB' }
        $path = [regex]::Match($text, '<a href="([^"]+/marketcap/)"').Groups[1].Value
        if (!$name -or !$ticker -or !$capText -or !$country -or !$path) { throw "Incomplete company row: $name" }
        $cap = [double]::Parse($capText, $culture)
        if ($cap -le 0) { throw "Invalid market cap: $name" }
        if (!$companies.Contains($ticker)) {
            $companies[$ticker] = [ordered]@{ name = $name; ticker = $ticker; marketCapUsd = $cap; country = $country; gaming = $false; sourceUrl = "$base$path" }
        }
        if ($url.Contains('/video-games/')) { $companies[$ticker].gaming = $true }
    }
}
[xml]$fx = (Invoke-WebRequest -Uri 'https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml' -UseBasicParsing).Content
$fxDay = $fx.SelectSingleNode('//*[@time]')
$usd = $fx.SelectSingleNode('//*[@currency="USD"]')
if (!$fxDay -or !$usd) { throw 'Missing ECB reference rate.' }
$rate = [double]::Parse($usd.rate, $culture)
if ($rate -lt 0.5 -or $rate -gt 2) { throw 'Unexpected EUR/USD rate; review before updating.' }
if ($companies.Count -lt 1000) { throw 'Too few unique companies.' }
$snapshot = [ordered]@{
    retrievedOn = (Get-Date -Format 'yyyy-MM-dd'); fxDate = $fxDay.time; usdPerEur = $rate
    sources = $urls; fxSource = 'https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html'
    companies = @($companies.Values | Sort-Object { $_.marketCapUsd } -Descending)
}
$target = [IO.Path]::GetFullPath($OutputPath)
[IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($target)) | Out-Null
[IO.File]::WriteAllText($target, ($snapshot | ConvertTo-Json -Depth 8), [Text.UTF8Encoding]::new($false))
Write-Output "Saved $($companies.Count) companies. Retrieved $($snapshot.retrievedOn), USD/EUR $rate ($($snapshot.fxDate))."
