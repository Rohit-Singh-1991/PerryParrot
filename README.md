# Perry Parrot — Free Local AI

Perry Parrot is a free interview-practice workspace. **AI answers run through Ollama on your own computer.** The app has no paid AI provider, API key, subscription, or usage-metered fallback.

## One-time setup on Windows

1. Install or update Ollama from https://ollama.com/download.
2. Open PowerShell and run:
   ```powershell
   ollama --version
   ollama pull qwen2.5:3b
   ollama list
   ```
3. In Windows **Edit environment variables for your account**, add or update this user variable:
   - Name: `OLLAMA_ORIGINS`
   - Value: `https://interviewmate-three.vercel.app,https://perry-parrot-newdivide4-8630.vercel.app,https://jobpilot-ai-topaz.vercel.app,http://localhost:5173,http://127.0.0.1:5173`
4. Fully quit Ollama from the system tray, then start it again. The setting is not picked up until Ollama restarts.
5. Open https://perry-parrot-newdivide4-8630.vercel.app → Settings → **Check server connection**.

The model uses your computer's CPU/GPU, memory, disk space, electricity, and local Ollama process. There are no AI API usage charges. The web interface is deployed to Vercel; hosting remains subject to the limits of the selected Vercel plan.

## If `http://localhost:11434/api/tags` returns 404

The Ollama local API's documented model-list endpoint is `GET /api/tags`. A 404 means the service answering on that port is not serving the expected endpoint, or the local Ollama installation/server needs attention. See the official API reference: https://github.com/ollama/ollama/blob/main/docs/api.md.

In PowerShell run these commands one at a time:
```powershell
ollama --version
ollama list
curl.exe -i http://localhost:11434/api/tags
curl.exe -i http://127.0.0.1:11434/api/tags
```

A working endpoint returns HTTP 200 and JSON containing a `models` array. If either address works, use that address to test your local server. If both return 404:
- Fully quit Ollama from the system tray and reopen it.
- If it still happens, update/reinstall Ollama from https://ollama.com/download, then rerun `ollama list` and the `curl.exe` tests.
- `Qwen Code` is a separate coding CLI and is **not required** by Perry Parrot. Do not run its installer to set up Perry Parrot.

Do not expose port 11434 to the public internet. Keep `OLLAMA_ORIGINS` limited to the exact InterviewMate, Perry Parrot, and Job-Pilot app origins and local development origins you use; preserve all three app origins rather than replacing one with another. If the endpoint works in PowerShell but the site cannot reach it, check Chrome's local-network permission prompt and verify the origin variable, then restart Ollama.

## Meeting platform coverage

The desktop live-session panel offers **Microsoft Teams → Google Meet → Zoom** as selectable contexts and suggests a shareable window whose title matches the selected platform. This is a source-selection aid, not an official Teams/Meet/Zoom API integration. All three use the same Windows/Electron desktop capture path: selected display/window video plus system-audio loopback where Electron/Windows exposes it, local Whisper transcription, local OCR, and local Ollama answers. If the selected source has no audio track, capture stops with a platform-labelled diagnostic rather than claiming the meeting is connected. Official meeting APIs, account OAuth, and platform-specific transcript access are not configured.

Automated Playwright coverage uses mocked desktop sources to verify source selection for Teams, Meet, and Zoom. It does not prove that live system audio works on a physical Windows device. Before relying on it, run a consent-based test meeting on each platform, select the matching window or full display, verify that the local transcript changes when speech plays, and confirm Stop ends capture.

## Windows desktop app (free)

The desktop edition is packaged with Electron and includes a separate always-on-top **visible** answer window. On Windows, the Desktop live meeting session lets you select a screen/window, capture system loopback audio where Windows/Electron exposes it, transcribe English speech with the free local `onnx-community/whisper-tiny.en` model, OCR the selected display locally with Tesseract, and combine detected spoken questions with screen text before asking local Ollama for an answer. First launch downloads the speech model and OCR language data; there are no paid AI APIs. Model downloads require internet once, then cached models can run locally.

Build/run from Windows with Node.js installed:

```powershell
npm install
npm run desktop:dev
```

Build the Windows installer:

```powershell
npm run desktop:build
```

The installer is produced under `release/`. GitHub Actions also builds a Windows installer and uploads it as an artifact on each push to `main` (artifact retained for 14 days). The desktop audio path is platform-dependent; automated builds do not substitute for testing system audio on your own Windows device. Select a screen and verify that audio tracks are available before relying on live transcription. The answer window stays visible and is not a hidden/undetectable overlay.

## Free features

- Live Copilot answers from local `qwen2.5:3b` via Ollama.
- Interview Prep and Question Analyzer use the same local model.
- Browser-side extraction for TXT, Markdown, DOCX, selectable-text PDFs, scanned-PDF OCR, and screenshot/image OCR using Tesseract.js.
- Explicit one-frame meeting-screen capture: choose a tab/window through the browser's native capture picker, OCR the frame locally, and generate an answer with local Ollama.
- Combined live session: user-selected screen OCR refreshes every five seconds while microphone speech recognition runs; after a detected spoken question pauses, the answer prompt combines the transcript with the latest visible screen text.
- Voice practice via browser speech recognition after the user explicitly starts it; recognition attempts to resume if Chrome ends a session.
- History held in the current browser session.
- Optional Chrome extension in `extension/`: press **Alt+A** to scan readable text on the active tab and open Perry Parrot. It does not automatically run on every page.

Uploaded audio-file transcription is not included. Screenshot/image OCR, scanned-PDF OCR, and the user-triggered one-frame screen capture run locally in the browser; Tesseract.js may download its worker/language data on first use, but captured image content is processed in the browser. The one-frame capture action stops after one frame. Combined live session is different: it uses a persistent user-selected screen-share stream, with a visible browser capture indicator, and OCRs frames every five seconds until stopped. It is not hidden or stealth capture. Voice practice uses browser speech-recognition services where provided by the browser; browser speech recognition may use browser-provided services, but it does not call a Perry Parrot paid AI API.

## Run locally

```powershell
npm install
npm run dev
```

Use only in mock interviews or other situations where AI assistance is permitted. Voice practice uses the microphone only after you click Start; it does not directly capture Teams/Meet/Zoom system audio or identify speakers. The combined web session reads visible text from a screen the user explicitly selects and recognizes speech through the browser microphone API. The Windows desktop build adds an attempted system loopback audio path and local Whisper transcription, but real audio availability varies by OS and selected source and must be tested on the target machine. Speaker diarization is not implemented.
