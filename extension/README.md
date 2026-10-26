# Perry Parrot Page Scanner (Chrome)

This is an explicit, user-triggered page scanner for mock interviews, study, and permitted assistance.

## Install
1. Download the [PerryParrot repository](https://github.com/Rohit-Singh-1991/PerryParrot) ZIP from GitHub and extract it.
2. In Chrome, open `chrome://extensions`.
3. Turn on **Developer mode**.
4. Click **Load unpacked** and select this `extension` folder.
5. Confirm the extension is enabled.

## Use
1. Open a page with a practice question (e.g. a coding exercise, documentation, or plain-text notes).
2. Optionally select just the question to scan only that text.
3. Press **Alt+A**. If the shortcut is unavailable, set it in `chrome://extensions/shortcuts`.
4. Perry Parrot (https://perry-parrot-newdivide4-8630.vercel.app/) opens a new tab and generates a concise answer with a definition, practical use case, and code when relevant.
5. You can also click the extension icon to scan.

The extension reads visible page text only after the user explicitly invokes it. It does not run continuously, record audio, submit forms, or access Chrome internal pages. Avoid scanning sensitive/confidential pages. Page text is sent to the local Ollama model on the same computer when an answer is requested. No paid AI API is used.
