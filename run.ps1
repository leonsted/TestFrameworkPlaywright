param(
  [Parameter(Position = 0)]
  [ValidateSet('web', 'web-headed', 'cross', 'mobile-web', 'all-ui', 'android', 'ios', '1c', 'testmo', 'unit', 'onec')]
  [string]$Target = 'web',
  [Parameter(Position = 1)]
  [string]$Environment = 'dev'
)

$ErrorActionPreference = 'Stop'
$env:TEST_ENV = $Environment
Set-Location $PSScriptRoot

switch ($Target) {
  'web' { npm run test:web }
  'web-headed' { npm run test:web:headed }
  'cross' { npm run test:cross }
  'mobile-web' { npm run test:mobile-web }
  'all-ui' { npm run test:all-ui }
  'android' { npm run test:android }
  'ios' { npm run test:ios }
  '1c' { npm run check:1c }
  'testmo' { npm run report:testmo }
  'unit' { npm run test:unit }
  'onec' { npm run test:onec }
}
