const APP_URL = "https://perry-parrot-newdivide4-8630.vercel.app/";

async function scanActiveTab(tab) {
  if (!tab || !tab.id || !tab.url || /^(chrome|edge|about|chrome-extension):\/\//i.test(tab.url)) {
    await chrome.tabs.create({ url: APP_URL });
    return;
  }
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const selected = window.getSelection()?.toString().trim() || "";
        const body = document.body?.innerText || "";
        return { title: document.title || "", text: (selected || body).slice(0, 12000) };
      }
    });
    const result = results?.[0]?.result;
    const text = (result?.text || "").trim();
    if (!text) {
      await chrome.tabs.create({ url: APP_URL });
      return;
    }
    const payload = (result.title ? "Page: " + result.title + "\n\n" : "") + text;
    // Fragment is client-side only; the app removes it after reading it.
    await chrome.tabs.create({ url: APP_URL + "#scan=" + encodeURIComponent(payload) });
  } catch (error) {
    console.warn("Perry Parrot scan failed. The page may be protected.", error);
    await chrome.tabs.create({ url: APP_URL });
  }
}

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "scan-current-tab") return;
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  await scanActiveTab(tab);
});

chrome.action.onClicked.addListener(async (tab) => scanActiveTab(tab));
