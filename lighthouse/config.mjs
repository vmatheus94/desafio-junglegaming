import desktopConfig from 'lighthouse/core/config/desktop-config.js'

const onlyCategories = ['performance', 'accessibility', 'best-practices', 'seo']

const mobile = {
  extends: 'lighthouse:default',
  settings: {
    onlyCategories,
    formFactor: 'mobile',
    throttlingMethod: 'simulate',
    throttling: {
      rttMs: 150,
      throughputKbps: 1638.4,
      requestLatencyMs: 562.5,
      downloadThroughputKbps: 1474.56,
      uploadThroughputKbps: 675,
      cpuSlowdownMultiplier: 4,
    },
    screenEmulation: { mobile: true, width: 412, height: 823, deviceScaleFactor: 1.75, disabled: false },
  },
}

const desktop = {
  ...desktopConfig,
  settings: { ...desktopConfig.settings, onlyCategories },
}

export default { mobile, desktop }
