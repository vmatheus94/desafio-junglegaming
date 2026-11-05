$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$assets = @(
  @{ Url = "https://www.figma.com/api/mcp/asset/9b7f55a9-1ece-47ae-a1a3-c93ab1105f7c/8f387.png"; Dest = "public/assets/nfts/emerald-ape.png" }
  @{ Url = "https://www.figma.com/api/mcp/asset/3159e6d5-da20-444a-b936-e69899557b71/83794.png"; Dest = "public/assets/nfts/sage-nomad.png" }
  @{ Url = "https://www.figma.com/api/mcp/asset/3159e6d5-da20-444a-b936-e69899557b71/9add2.png"; Dest = "public/assets/nfts/ivory-baron.png" }
  @{ Url = "https://www.figma.com/api/mcp/asset/3159e6d5-da20-444a-b936-e69899557b71/b7cfc.png"; Dest = "public/assets/nfts/golden-beat.png" }
  @{ Url = "https://www.figma.com/api/mcp/asset/9b7f55a9-1ece-47ae-a1a3-c93ab1105f7c/dc76c.svg"; Dest = "public/assets/figma/hero-bg.svg" }
  @{ Url = "https://www.figma.com/api/mcp/asset/9b7f55a9-1ece-47ae-a1a3-c93ab1105f7c/a11b7.svg"; Dest = "public/assets/figma/hero-dots.svg" }
  @{ Url = "https://www.figma.com/api/mcp/asset/8db44689-b65e-4ce6-82c8-d004b03c4f67/68d8c.svg"; Dest = "public/assets/figma/promo-mask.svg" }
  @{ Url = "https://www.figma.com/api/mcp/asset/c2e87cc9-44ec-4daf-b556-b13e3c63c754/bd8c9.svg"; Dest = "public/assets/figma/search.svg" }
  @{ Url = "https://www.figma.com/api/mcp/asset/c2e87cc9-44ec-4daf-b556-b13e3c63c754/c0c08.svg"; Dest = "public/assets/figma/cart.svg" }
  @{ Url = "https://www.figma.com/api/mcp/asset/c2e87cc9-44ec-4daf-b556-b13e3c63c754/aa630.svg"; Dest = "public/assets/figma/cart-badge.svg" }
  @{ Url = "https://www.figma.com/api/mcp/asset/c2e87cc9-44ec-4daf-b556-b13e3c63c754/62554.svg"; Dest = "public/assets/figma/login.svg" }
  @{ Url = "https://www.figma.com/api/mcp/asset/c2e87cc9-44ec-4daf-b556-b13e3c63c754/9ae7b.svg"; Dest = "public/assets/figma/zoom.svg" }
  @{ Url = "https://www.figma.com/api/mcp/asset/c2e87cc9-44ec-4daf-b556-b13e3c63c754/19a5f.svg"; Dest = "public/assets/figma/star.svg" }
  @{ Url = "https://www.figma.com/api/mcp/asset/c2e87cc9-44ec-4daf-b556-b13e3c63c754/89357.svg"; Dest = "public/assets/figma/star-half.svg" }
  @{ Url = "https://www.figma.com/api/mcp/asset/c2e87cc9-44ec-4daf-b556-b13e3c63c754/7d18c.svg"; Dest = "public/assets/figma/minus.svg" }
  @{ Url = "https://www.figma.com/api/mcp/asset/c2e87cc9-44ec-4daf-b556-b13e3c63c754/a803c.svg"; Dest = "public/assets/figma/plus.svg" }
  @{ Url = "https://www.figma.com/api/mcp/asset/c2e87cc9-44ec-4daf-b556-b13e3c63c754/d427d.svg"; Dest = "public/assets/figma/heart.svg" }
  @{ Url = "https://www.figma.com/api/mcp/asset/c2e87cc9-44ec-4daf-b556-b13e3c63c754/a4abe.svg"; Dest = "public/assets/figma/linkedin.svg" }
  @{ Url = "https://www.figma.com/api/mcp/asset/c2e87cc9-44ec-4daf-b556-b13e3c63c754/fbcbd.svg"; Dest = "public/assets/figma/twitter.svg" }
  @{ Url = "https://www.figma.com/api/mcp/asset/c2e87cc9-44ec-4daf-b556-b13e3c63c754/bec29.svg"; Dest = "public/assets/figma/message.svg" }
  @{ Url = "https://www.figma.com/api/mcp/asset/c2e87cc9-44ec-4daf-b556-b13e3c63c754/99280.svg"; Dest = "public/assets/figma/social-1.svg" }
  @{ Url = "https://www.figma.com/api/mcp/asset/c2e87cc9-44ec-4daf-b556-b13e3c63c754/d48dd.svg"; Dest = "public/assets/figma/social-2.svg" }
  @{ Url = "https://www.figma.com/api/mcp/asset/c2e87cc9-44ec-4daf-b556-b13e3c63c754/b4111.svg"; Dest = "public/assets/figma/social-3.svg" }
  @{ Url = "https://www.figma.com/api/mcp/asset/c2e87cc9-44ec-4daf-b556-b13e3c63c754/b8b84.svg"; Dest = "public/assets/figma/social-4.svg" }
  @{ Url = "https://www.figma.com/api/mcp/asset/c2e87cc9-44ec-4daf-b556-b13e3c63c754/ca2da.svg"; Dest = "public/assets/figma/social-5.svg" }
  @{ Url = "https://www.figma.com/api/mcp/asset/3159e6d5-da20-444a-b936-e69899557b71/7e373.svg"; Dest = "public/assets/figma/arrow-down.svg" }
  @{ Url = "https://www.figma.com/api/mcp/asset/3159e6d5-da20-444a-b936-e69899557b71/1fbca.svg"; Dest = "public/assets/figma/arrow-right2.svg" }
  @{ Url = "https://www.figma.com/api/mcp/asset/8db44689-b65e-4ce6-82c8-d004b03c4f67/e0393.svg"; Dest = "public/assets/figma/arrow-right.svg" }
  @{ Url = "https://www.figma.com/api/mcp/asset/b808ed28-0261-4717-94e2-33ffd32cd3db/4453a.svg"; Dest = "public/assets/figma/minus-sm.svg" }
  @{ Url = "https://www.figma.com/api/mcp/asset/b808ed28-0261-4717-94e2-33ffd32cd3db/f8641.svg"; Dest = "public/assets/figma/plus-sm.svg" }
  @{ Url = "https://www.figma.com/api/mcp/asset/b808ed28-0261-4717-94e2-33ffd32cd3db/e196c.svg"; Dest = "public/assets/figma/delete.svg" }
  @{ Url = "https://www.figma.com/api/mcp/asset/3dc9ae0a-5370-4896-b967-22ebf34e3823/510ea.svg"; Dest = "public/assets/figma/chevron-down.svg" }
  @{ Url = "https://www.figma.com/api/mcp/asset/3dc9ae0a-5370-4896-b967-22ebf34e3823/64528.svg"; Dest = "public/assets/figma/chevron-down-light.svg" }
  @{ Url = "https://www.figma.com/api/mcp/asset/3dc9ae0a-5370-4896-b967-22ebf34e3823/ec1ea.svg"; Dest = "public/assets/figma/radio-off.svg" }
  @{ Url = "https://www.figma.com/api/mcp/asset/3dc9ae0a-5370-4896-b967-22ebf34e3823/fbc42.svg"; Dest = "public/assets/figma/radio-wallet-off.svg" }
  @{ Url = "https://www.figma.com/api/mcp/asset/3dc9ae0a-5370-4896-b967-22ebf34e3823/79e5b.svg"; Dest = "public/assets/figma/coinbase-mark.svg" }
  @{ Url = "https://www.figma.com/api/mcp/asset/32389d20-992e-412d-95e6-282374a4a7ee/21283.svg"; Dest = "public/assets/figma/thank-you.svg" }
  @{ Url = "https://www.figma.com/api/mcp/asset/32389d20-992e-412d-95e6-282374a4a7ee/339b7.svg"; Dest = "public/assets/figma/close.svg" }
  @{ Url = "https://www.figma.com/api/mcp/asset/aa36c791-e423-45bd-876b-8e93e6ce3639/352b3.svg"; Dest = "public/assets/figma/m-shop.svg" }
  @{ Url = "https://www.figma.com/api/mcp/asset/aa36c791-e423-45bd-876b-8e93e6ce3639/99dca.svg"; Dest = "public/assets/figma/m-user.svg" }
  @{ Url = "https://www.figma.com/api/mcp/asset/aa36c791-e423-45bd-876b-8e93e6ce3639/ce4db.svg"; Dest = "public/assets/figma/m-search.svg" }
  @{ Url = "https://www.figma.com/api/mcp/asset/aa36c791-e423-45bd-876b-8e93e6ce3639/bc3bf.svg"; Dest = "public/assets/figma/m-filter.svg" }
  @{ Url = "https://www.figma.com/api/mcp/asset/aa36c791-e423-45bd-876b-8e93e6ce3639/f545d.svg"; Dest = "public/assets/figma/m-hero-mask.svg" }
  @{ Url = "https://www.figma.com/api/mcp/asset/aa36c791-e423-45bd-876b-8e93e6ce3639/bf307.svg"; Dest = "public/assets/figma/m-arrow-right.svg" }
  @{ Url = "https://www.figma.com/api/mcp/asset/aa36c791-e423-45bd-876b-8e93e6ce3639/c6c5e.svg"; Dest = "public/assets/figma/m-dots.svg" }
  @{ Url = "https://www.figma.com/api/mcp/asset/aa36c791-e423-45bd-876b-8e93e6ce3639/364ee.svg"; Dest = "public/assets/figma/m-heart-filled.svg" }
  @{ Url = "https://www.figma.com/api/mcp/asset/aa36c791-e423-45bd-876b-8e93e6ce3639/d6529.svg"; Dest = "public/assets/figma/m-heart-outline.svg" }
  @{ Url = "https://www.figma.com/api/mcp/asset/aa36c791-e423-45bd-876b-8e93e6ce3639/3b81f.svg"; Dest = "public/assets/figma/m-tabbar.svg" }
  @{ Url = "https://www.figma.com/api/mcp/asset/aa36c791-e423-45bd-876b-8e93e6ce3639/b1ba5.svg"; Dest = "public/assets/figma/m-tab-center.svg" }
  @{ Url = "https://www.figma.com/api/mcp/asset/aa36c791-e423-45bd-876b-8e93e6ce3639/b096d.svg"; Dest = "public/assets/figma/m-home.svg" }
  @{ Url = "https://www.figma.com/api/mcp/asset/aa36c791-e423-45bd-876b-8e93e6ce3639/c40be.svg"; Dest = "public/assets/figma/m-heart.svg" }
)
$ok = 0; $fail = 0
foreach ($a in $assets) {
  $dest = Join-Path $root $a.Dest
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $dest) | Out-Null
  try {
    Invoke-WebRequest -Uri $a.Url -OutFile $dest -UseBasicParsing
    Write-Host "OK   $($a.Dest)"
    $ok++
  } catch {
    Write-Host "ERRO $($a.Dest): $($_.Exception.Message)" -ForegroundColor Red
    $fail++
  }
}
Write-Host ""
Write-Host "$ok arquivo(s) baixado(s), $fail erro(s)."
