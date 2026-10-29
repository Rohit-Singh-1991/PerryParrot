const assert = require('node:assert/strict');
const { _electron: electron } = require('playwright');

(async () => {
  const app = await electron.launch({
    args: ['.'],
    timeout: 60000,
    env: { ...process.env, ELECTRON_DISABLE_SECURITY_WARNINGS: 'true' }
  });

  try {
    const page = await app.firstWindow();
    await page.waitForLoadState('domcontentloaded', { timeout: 30000 });
    await page.waitForFunction(() => Boolean(window.perryParrotDesktop?.isDesktop), null, { timeout: 15000 });

    const title = await page.title();
    assert.match(title, /Perry Parrot/i, 'desktop app should load Perry Parrot');

    const sources = await page.evaluate(() => window.perryParrotDesktop.listSources());
    assert.ok(Array.isArray(sources), 'desktop source bridge should return an array');

    const denied = await page.evaluate(() => window.perryParrotDesktop.ollamaTags('https://example.com'));
    assert.equal(denied.ok, false, 'remote Ollama endpoints must be rejected');
    assert.match(denied.data?.error || '', /Only the local Ollama endpoint is allowed/i);

    const updated = await page.evaluate(() => window.perryParrotDesktop.updateAnswer({
      question: 'desktop smoke test',
      answer: 'bridge passed'
    }));
    assert.equal(updated, true, 'answer-window IPC bridge should accept a bounded payload');

    console.log(JSON.stringify({
      status: 'PASS',
      title,
      sourceListReturned: true,
      remoteOllamaBlocked: true,
      answerBridge: true,
      sourceCount: sources.length
    }));
  } finally {
    await app.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
