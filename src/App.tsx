import React, { useEffect, useRef, useState } from 'react';
import DesktopMeetingPanel from './DesktopMeetingPanel';
import { AudioLines, LayoutDashboard, Radio, FileText, ScanLine, History, Settings as Gear, ShieldCheck, Sparkles, ArrowRight, Play, Upload, KeyRound, CheckCircle2, AlertTriangle, Copy, Trash2, Menu, X, FileUp, Mic, MessageSquare, LoaderCircle, ExternalLink, LockKeyhole, BookOpen, BriefcaseBusiness, ScreenShare } from 'lucide-react';
type Page = 'Dashboard' | 'Live Copilot' | 'Interview Prep' | 'Question Analyzer' | 'History' | 'Settings';
type Chat = { q: string; a: string; time: string };
const pages: Page[] = ['Dashboard', 'Live Copilot', 'Interview Prep', 'Question Analyzer', 'History', 'Settings'];
export default function App() {
  const [page, setPage] = useState<Page>('Dashboard'), [menu, setMenu] = useState(false), [status, setStatus] = useState('Not checked'), [serverConfigured, setServerConfigured] = useState(false);
  const [ollamaBase, setOllamaBase] = useState<'http://localhost:11434' | 'http://127.0.0.1:11434'>('http://localhost:11434');
  const [question, setQuestion] = useState(''), [answer, setAnswer] = useState(''), [busy, setBusy] = useState(false), [resume, setResume] = useState(''), [jd, setJd] = useState(''), [prep, setPrep] = useState(''), [fileName, setFileName] = useState(''), [analysis, setAnalysis] = useState(''), [analysisQ, setAnalysisQ] = useState(''), [history, setHistory] = useState<Chat[]>([]), [audioText, setAudioText] = useState(''), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [prefs, setPrefs] = useState({ language: 'English', verbosity: 'Concise' });
  const [voiceStatus, setVoiceStatus] = useState('Voice practice is off');
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceListening, setVoiceListening] = useState(false);
  const [capturingScreen, setCapturingScreen] = useState(false);
  const [liveSession, setLiveSession] = useState(false);
  const [screenTranscript, setScreenTranscript] = useState('');
  const screenTextRef = useRef('');
  const screenStreamRef = useRef<MediaStream | null>(null);
  const screenVideoRef = useRef<HTMLVideoElement | null>(null);
  const screenWorkerRef = useRef<any>(null);
  const screenTimerRef = useRef<number | null>(null);
  const screenScanBusyRef = useRef(false);
  const voiceRecognition = useRef<any>(null);
  const voiceTimer = useRef<number | null>(null);
  const voiceTranscriptRef = useRef('');
  const voiceActiveRef = useRef(false);

  useEffect(() => { try { const x = localStorage.getItem('im-prefs'); if (x) setPrefs(JSON.parse(x)); } catch { /* ignore corrupt preferences */ } }, []);
  useEffect(() => { try { localStorage.setItem('im-prefs', JSON.stringify(prefs)); } catch { /* storage may be blocked */ } }, [prefs]);
  useEffect(() => { try { localStorage.removeItem('im-provider'); } catch { /* storage may be blocked */ } }, []);
  const notify = (s: string) => { setNotice(s); window.setTimeout(() => setNotice(''), 4500); };
  const generateAnswer = async (questionText: string, verbosity = prefs.verbosity) => {
    const body = { model: 'qwen2.5:3b', stream: false, messages: [
      { role: 'system', content: `You are Perry Parrot, a truthful interview preparation coach. Use ${prefs.language}. Answer detail: ${verbosity}. Give accurate, structured answers; coding topics should include approach, code and complexity where relevant. Never invent candidate experience or metrics. For STAR prompts, use placeholders for real details. Intended for practice or use where permitted.` },
      { role: 'user', content: questionText.trim() }
    ], options: { temperature: 0.3, num_predict: verbosity === 'Concise' ? 500 : verbosity === 'Detailed' ? 1800 : 1000 } };
    let response: { ok: boolean; status: number; json: () => Promise<any> };
    try {
      if (window.perryParrotDesktop) {
        const local = await window.perryParrotDesktop.ollamaChat(ollamaBase, body);
        response = { ok: local.ok, status: local.status, json: async () => local.data };
      } else {
        response = await fetch(ollamaBase + '/api/chat', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      }
    } catch { throw new Error('Free local AI is not reachable. Install Ollama, run “ollama pull qwen2.5:3b”, then open Settings and check the server connection.'); }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(response.status === 404 ? 'Ollama returned 404 for /api/chat. Confirm that this is the official Ollama server, then update/restart Ollama from https://ollama.com/download.' : (data.error || 'Ollama could not generate an answer. Check that Ollama is running and the model is installed.'));
    const answerText = data.message?.content?.trim();
    if (!answerText) throw new Error('Local model returned an empty answer. Try again.');
    return { answer: answerText, provider: 'Ollama', model: data.model || 'qwen2.5:3b' };
  };
  const ask = async (q = question, displayQuestion = q) => { if (!q.trim()) return; setBusy(true); setError(''); setAnswer(''); try { const d = await generateAnswer(q); setAnswer(d.answer); setQuestion(displayQuestion); setHistory(h => [{ q: displayQuestion, a: d.answer, time: new Date().toLocaleString() }, ...h]); if (window.perryParrotDesktop) void window.perryParrotDesktop.updateAnswer({ question: displayQuestion, answer: d.answer }); } catch (e) { setError((e as Error).message); } finally { setBusy(false); } };
  useEffect(() => {
    // Chrome extension passes text in the URL fragment so it is not sent to the web server.
    const prefix = '#scan=';
    if (!window.location.hash.startsWith(prefix)) return;
    let scanned = '';
    try { scanned = decodeURIComponent(window.location.hash.slice(prefix.length)).slice(0, 12000).trim(); } catch { scanned = ''; }
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    if (!scanned) return;
    setPage('Live Copilot');
    setQuestion(scanned);
    setError('');
    setAnswer('');
    setBusy(true);
    void (async () => {
      try {
        const d = await generateAnswer('You are helping with a consent-based mock interview. Answer briefly and directly. Use headings: Definition, Real-world use case, and Code (only if relevant). If the scanned text contains multiple questions, answer the clearest question first.\n\nPage text / question:\n' + scanned, 'Concise');
        setAnswer(d.answer);
        setHistory(h => [{ q: scanned, a: d.answer, time: new Date().toLocaleString() }, ...h]);
      } catch (e) { setError((e as Error).message); }
      finally { setBusy(false); }
    })();
  // Process only once on mount; the hash is removed before the network request.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const requestTags = async (base: 'http://localhost:11434' | 'http://127.0.0.1:11434') => {
    if (window.perryParrotDesktop) {
      const local = await window.perryParrotDesktop.ollamaTags(base);
      return { ok: local.ok, status: local.status, json: async () => local.data };
    }
    return fetch(base + '/api/tags', { cache: 'no-store' });
  };
  const check = async () => {
    setBusy(true); setError('');
    try {
      let base: 'http://localhost:11434' | 'http://127.0.0.1:11434' = 'http://localhost:11434';
      let r: { ok: boolean; status: number; json: () => Promise<any> } | null = null;
      try { r = await requestTags(base); } catch { /* try the alternate loopback address below */ }
      if (!r || !r.ok) {
        try {
          const alternate = await requestTags('http://127.0.0.1:11434');
          if (alternate.ok) {
            base = 'http://127.0.0.1:11434';
            r = alternate;
          } else if (!r) {
            r = alternate;
          }
        } catch { /* report both attempts below */ }
      }
      if (!r) throw new Error('Neither localhost nor 127.0.0.1 could reach the service on port 11434. Start/restart Ollama and try again.');
      if (!r.ok) {
        if (r.status === 404) throw new Error('Ollama API check returned HTTP 404 on port 11434. Try both http://localhost:11434/api/tags and http://127.0.0.1:11434/api/tags. If both return 404, update/reinstall the official Ollama app from https://ollama.com/download and restart it. This is not an API-key or billing issue.');
        throw new Error('Local AI endpoint returned HTTP ' + r.status + '. Restart Ollama and retry.');
      }
      const d = await r.json();
      if (!Array.isArray(d.models)) throw new Error('Port 11434 responded, but did not return Ollama’s expected models list. Another app may be using that port.');
      setOllamaBase(base);
      const installed = d.models.some((m: any) => m.name === 'qwen2.5:3b' || m.name?.startsWith('qwen2.5:3b-'));
      setServerConfigured(installed); setStatus(installed ? 'Free local model ready' : 'Ollama connected · model missing');
      if (installed) {
        notify('Local AI is ready. No API key or usage fee is needed.');
      } else {
        setError('Ollama is reachable, but qwen2.5:3b is not installed. In PowerShell run: ollama pull qwen2.5:3b');
      }
    } catch (e) {
      setStatus('Connection failed');
      const message = e instanceof Error ? e.message : 'Unknown connection error.';
      setError(message);
    } finally { setBusy(false); }
  };
  const uploadText = async (f: File, kind: string) => { setError(''); setFileName(f.name); if (f.size > 8 * 1024 * 1024) { setError('Keep uploads under 8 MB.'); return; } const ext = f.name.toLowerCase().split('.').pop(); try { if (ext === 'txt' || ext === 'md') { const t = await f.text(); if (kind === 'resume') setResume(t); else if (kind === 'analyzer') setAnalysisQ(t); else setQuestion(t); notify('Text file extracted locally.'); return; } if (ext === 'docx') { const mammoth = await import('mammoth'); const x = await mammoth.extractRawText({ arrayBuffer: await f.arrayBuffer() }); if (kind === 'resume') setResume(x.value); else if (kind === 'analyzer') setAnalysisQ(x.value); else setQuestion(x.value); notify('DOCX extracted locally.'); return; } if (ext === 'pdf') { const pdf = await import('pdfjs-dist'); pdf.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs'; const doc = await pdf.getDocument({ data: await f.arrayBuffer() }).promise; let text = ''; for (let i = 1; i <= doc.numPages; i++) { const p = await doc.getPage(i); const c = await p.getTextContent(); text += c.items.map((it: any) => 'str' in it ? it.str : '').join(' ') + '\n'; } if (!text.trim()) { const { createWorker } = await import('tesseract.js'); const worker = await createWorker(prefs.language === 'Hindi' ? 'hin' : 'eng'); try { const pages: string[] = []; for (let i = 1; i <= doc.numPages; i++) { const p = await doc.getPage(i); const viewport = p.getViewport({ scale: 1.5 }); const canvas = document.createElement('canvas'); canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height); const context = canvas.getContext('2d'); if (!context) continue; await p.render({ canvasContext: context, viewport }).promise; const ocr = await worker.recognize(canvas); if (ocr.data.text.trim()) pages.push(ocr.data.text.trim()); canvas.width = 0; canvas.height = 0; } text = pages.join('\\n\\n'); } finally { await worker.terminate(); } if (!text.trim()) throw Error('No readable text found in this PDF. Try a clearer scan.'); notify('Scanned PDF OCR completed locally in your browser.'); } if (kind === 'resume') setResume(text); else if (kind === 'analyzer') setAnalysisQ(text); else setQuestion(text); notify('PDF text extracted locally.'); return; } if (['png', 'jpg', 'jpeg', 'webp'].includes(ext || '')) { const { createWorker } = await import('tesseract.js'); const language = prefs.language === 'Hindi' ? 'hin' : 'eng'; const worker = await createWorker(language); try { const result = await worker.recognize(f); const text = result.data.text.trim(); if (!text) throw Error('No readable text found. Try a clearer, straight-on screenshot.'); if (kind === 'resume') setResume(text); else if (kind === 'analyzer') setAnalysisQ(text); else setQuestion(text); notify('Screenshot OCR completed locally in your browser.'); } finally { await worker.terminate(); } return; } throw Error('Supported files: TXT, MD, DOCX and selectable-text PDF.'); } catch (e) { setError((e as Error).message); } };
  const makePrep = async () => { setBusy(true); setError(''); try { const d = await generateAnswer('Prepare an interview plan using this resume and job description. List strengths, gaps, six likely questions and STAR themes. Do not invent facts. RESUME:\n' + resume + '\nJOB DESCRIPTION:\n' + jd, 'Detailed'); setPrep(d.answer); } catch (e) { setError((e as Error).message); } finally { setBusy(false); } };
  const analyze = async () => { setBusy(true); setError(''); try { const d = await generateAnswer('Analyze this interview question with concept, structured sample answer, code where relevant, trade-offs and follow-ups:\n' + analysisQ); setAnalysis(d.answer); } catch (e) { setError((e as Error).message); } finally { setBusy(false); } };
  const stopVoicePractice = () => {
    voiceActiveRef.current = false;
    if (screenTimerRef.current !== null) window.clearInterval(screenTimerRef.current);
    screenTimerRef.current = null;
    screenStreamRef.current?.getTracks().forEach(track => track.stop());
    screenStreamRef.current = null;
    if (screenVideoRef.current) { screenVideoRef.current.pause(); screenVideoRef.current.srcObject = null; screenVideoRef.current = null; }
    if (screenWorkerRef.current) { void screenWorkerRef.current.terminate().catch(() => {}); screenWorkerRef.current = null; }
    screenTextRef.current = '';
    setScreenTranscript('');
    setLiveSession(false);
    if (voiceTimer.current !== null) window.clearTimeout(voiceTimer.current);
    voiceTimer.current = null;
    try { voiceRecognition.current?.stop(); } catch { /* already stopped */ }
    voiceRecognition.current = null;
    setVoiceListening(false);
    setVoiceStatus('Voice practice stopped');
  };
  const startVoicePractice = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setVoiceStatus('Speech recognition is not supported in this browser. Try current Chrome.'); return; }
    try { voiceRecognition.current?.stop(); } catch { /* no active session */ }
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = prefs.language === 'Hindi' ? 'hi-IN' : 'en-US';
    voiceActiveRef.current = true;
    voiceTranscriptRef.current = '';
    setVoiceTranscript('');
    setVoiceListening(true);
    setVoiceStatus('Listening through your microphone — visible practice mode');
    rec.onresult = (event: any) => {
      let latest = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) latest += event.results[i][0].transcript + ' ';
      }
      if (!latest.trim()) return;
      voiceTranscriptRef.current = (voiceTranscriptRef.current + ' ' + latest).trim().slice(-12000);
      const snapshot = voiceTranscriptRef.current;
      setVoiceTranscript(snapshot);
      setVoiceStatus('Heard speech; waiting for a pause…');
      if (voiceTimer.current !== null) window.clearTimeout(voiceTimer.current);
      voiceTimer.current = window.setTimeout(() => {
        const q = voiceTranscriptRef.current.trim();
        const questionLike = /\?|\b(what|why|how|when|where|who|which|explain|define|describe|compare|difference|can you|could you|tell me|write|implement|solve)\b/i.test(q);
        if (!questionLike) { setVoiceStatus('No clear question detected. Keep listening or stop to review the transcript.'); return; }
        setVoiceStatus('Question detected — generating a concise answer…');
        // Submit each detected utterance once instead of repeatedly resending the full conversation.
        voiceTranscriptRef.current = '';
        setVoiceTranscript('');
        const visibleScreen = screenTextRef.current.trim();
        void ask('Answer this question from a consent-based mock interview. Be direct and concise. Include Definition, Real-world use case, and a short code example only if relevant. Use the screen text as supporting context only when relevant; prioritize the spoken question.\n\nSpoken question transcript:\n' + q + (visibleScreen ? '\n\nLatest OCR text from the user-selected shared screen:\n' + visibleScreen : ''));
      }, 1500);
    };
    rec.onerror = (event: any) => {
      const reason = event.error || 'unknown error';
      setVoiceStatus('Microphone/speech error: ' + reason);
      if (['not-allowed', 'service-not-allowed', 'audio-capture'].includes(reason)) {
        voiceActiveRef.current = false;
        setVoiceListening(false);
      }
    };
    rec.onend = () => {
      if (voiceActiveRef.current && voiceRecognition.current === rec) {
        // Chrome may end a continuous recognition session after a pause; restart while the user has it enabled.
        window.setTimeout(() => {
          if (!voiceActiveRef.current || voiceRecognition.current !== rec) return;
          try { rec.start(); setVoiceListening(true); setVoiceStatus('Listening through your microphone — visible practice mode'); }
          catch { setVoiceListening(false); setVoiceStatus('Speech recognition paused. Press Stop, then Start voice practice to retry.'); }
        }, 350);
        return;
      }
      setVoiceListening(false);
      if (voiceRecognition.current === rec) voiceRecognition.current = null;
      setVoiceStatus(current => current.includes('generating') ? current : 'Voice session ended');
    };
    voiceRecognition.current = rec;
    try { rec.start(); } catch (e) { setVoiceListening(false); setVoiceStatus('Could not start microphone recognition. Check browser permission.'); }
  };
  const startLiveSession = async () => {
    if (!navigator.mediaDevices?.getDisplayMedia) {
      setError('Live screen reading is not supported in this browser. Use the latest Chrome or Edge over HTTPS.');
      return;
    }
    setError('');
    setCapturingScreen(true);
    let stream: MediaStream | null = null;
    let worker: any = null;
    try {
      // Visible browser picker, explicit user choice, screen only; no system audio or hidden capture.
      stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      const video = document.createElement('video');
      video.muted = true;
      video.srcObject = stream;
      await video.play();
      await new Promise(resolve => window.setTimeout(resolve, 350));
      if (!video.videoWidth || !video.videoHeight) throw new Error('The selected screen did not provide a readable frame.');
      const { createWorker } = await import('tesseract.js');
      worker = await createWorker(prefs.language === 'Hindi' ? 'hin' : 'eng');
      const readFrame = async () => {
        if (screenScanBusyRef.current || !screenVideoRef.current || !screenWorkerRef.current) return;
        screenScanBusyRef.current = true;
        const canvas = document.createElement('canvas');
        try {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const context = canvas.getContext('2d');
          if (!context) return;
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          const result = await screenWorkerRef.current.recognize(canvas);
          const nextText = result.data.text.trim().slice(0, 10000);
          if (nextText && nextText !== screenTextRef.current) {
            screenTextRef.current = nextText;
            setScreenTranscript(nextText);
            setVoiceStatus('Live session active · screen text refreshed');
          }
        } catch {
          setVoiceStatus('Live session active · screen OCR will retry');
        } finally {
          canvas.width = 0;
          canvas.height = 0;
          screenScanBusyRef.current = false;
        }
      };
      screenStreamRef.current = stream;
      screenVideoRef.current = video;
      screenWorkerRef.current = worker;
      stream.getVideoTracks()[0]?.addEventListener('ended', () => {
        if (screenStreamRef.current === stream) stopVoicePractice();
      }, { once: true });
      await readFrame();
      screenTimerRef.current = window.setInterval(() => { void readFrame(); }, 5000);
      setLiveSession(true);
      setCapturingScreen(false);
      startVoicePractice();
      notify('Combined session started: microphone recognition + visible screen OCR. Choose Stop to end both.');
    } catch (e) {
      stream?.getTracks().forEach(track => track.stop());
      if (worker) await worker.terminate().catch(() => {});
      setCapturingScreen(false);
      const message = e instanceof Error ? e.message : 'Could not start the combined session.';
      setError(message.includes('denied') ? 'Screen sharing was cancelled. Select the meeting window in the browser picker to start both inputs.' : message);
    }
  };
  const captureMeetingScreen = async () => {
    if (!navigator.mediaDevices?.getDisplayMedia) {
      setError('Screen capture is not supported in this browser. Use the latest Chrome or Edge over HTTPS.');
      return;
    }
    let stream: MediaStream | null = null;
    setCapturingScreen(true);
    setError('');
    try {
      // Explicit, one-frame capture: the browser chooser requires the user to select a tab/window/screen.
      // No continuous recording or background capture is performed.
      stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      const video = document.createElement('video');
      video.muted = true;
      video.srcObject = stream;
      await video.play();
      await new Promise(resolve => window.setTimeout(resolve, 350));
      if (!video.videoWidth || !video.videoHeight) throw new Error('The selected tab/window did not provide a readable frame. Try again and keep the question visible.');
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Could not prepare the captured frame for OCR.');
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker(prefs.language === 'Hindi' ? 'hin' : 'eng');
      let text = '';
      try {
        const result = await worker.recognize(canvas);
        text = result.data.text.trim();
      } finally {
        await worker.terminate();
        canvas.width = 0;
        canvas.height = 0;
        video.pause();
        video.srcObject = null;
      }
      if (!text) throw new Error('No readable question was found in that frame. Keep the question visible, then capture again.');
      setQuestion(text);
      notify('One frame captured and OCR processed locally. Generating an answer…');
      await ask('Answer this question from a consent-based mock interview. Be direct and concise. Include Definition, Real-world use case, and a short code example only if relevant. The following text was OCR-extracted from a user-selected meeting screen; ignore irrelevant interface text.\n\n' + text);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Screen capture failed.';
      setError(message.includes('Permission denied') || message.includes('denied') ? 'Screen capture was cancelled or permission was denied. Choose a meeting tab/window in the browser picker to try again.' : message);
    } finally {
      stream?.getTracks().forEach(track => track.stop());
      setCapturingScreen(false);
    }
  };
  const setFile = (e: React.ChangeEvent<HTMLInputElement>, kind: string) => { const f = e.target.files?.[0]; if (f) void uploadText(f, kind); e.target.value = ''; };
  return <div className={'layout'}><aside className={'sidebar ' + (menu ? 'open' : '')}><div className="brand"><span className="logo"><AudioLines size={22} /></span><span>Perry Parrot<small>AI</small></span></div><p className="eyebrow">WORKSPACE</p>{pages.map((n, i) => { const Icon = [LayoutDashboard, Radio, FileText, ScanLine, History, Gear][i]; return <button key={n} className={'nav ' + (page === n ? 'active' : '')} onClick={() => { setPage(n); setMenu(false); }}><Icon size={18} />{n}{n === 'Live Copilot' && <i />}</button>; })}<div className="sidebar-bottom"><ShieldCheck size={16} />Practice with permission</div></aside><main className="main"><header><button className="mobile" onClick={() => setMenu(!menu)}>{menu ? <X /> : <Menu />}</button><span className="crumb">Workspace / <b>{page}</b></span><span className="chip"><i />{status}</span></header><div className="content">{page === 'Dashboard' && <><div className="hero"><p className="eyebrow">YOUR PERSONAL INTERVIEW WORKSPACE</p><h1>Prepare with clarity.<br /><em>Answer with confidence.</em></h1><p>Practice technical questions, review your resume, and organize interview preparation in one workspace.</p><div className="actions"><button className="primary" onClick={() => setPage('Live Copilot')}><Play size={16} />Start mock interview<ArrowRight size={16} /></button><button className="secondary" onClick={() => setPage('Interview Prep')}>Prepare for a role</button></div><p className="footnote">Use AI in mock interviews or wherever assistance is permitted.</p></div><div className="stats"><article><span>Answers generated</span><strong>{history.length.toString().padStart(2, '0')}</strong><small>This browser visit</small></article><article><span>Prep materials</span><strong>{resume && jd ? '02' : resume || jd ? '01' : '00'}</strong><small>Resume & target role</small></article><article><span>AI provider</span><strong>{serverConfigured ? 'Ready' : '—'}</strong><small>{status}</small></article><article><span>Meeting platforms</span><strong>Teams / Meet / Zoom</strong><small>Windows desktop capture; verify system audio</small></article></div><div className="section-title"><h2>Continue preparing</h2><span>Choose what helps today</span></div><div className="cards"><button onClick={() => setPage('Live Copilot')}><Radio /><h3>AI answer companion</h3><p>Ask real questions and get generated answers from free local AI.</p><span>Open copilot <ArrowRight size={14} /></span></button><button onClick={() => setPage('Interview Prep')}><BriefcaseBusiness /><h3>Resume & job match</h3><p>Extract documents and build a targeted preparation plan.</p><span>Prepare <ArrowRight size={14} /></span></button><button onClick={() => setPage('Question Analyzer')}><ScanLine /><h3>Question analyzer</h3><p>Analyze typed or extracted questions with AI.</p><span>Analyze <ArrowRight size={14} /></span></button></div></>}{page === 'Settings' && <><div className="page-title"><p className="eyebrow">MAKE IT YOURS</p><h1>Workspace Settings</h1><p>Use free local AI with Ollama on this computer. No paid AI API is used.</p></div><div className="panel"><div className="panel-head"><KeyRound /><div><h2>AI provider</h2><p>Local mode runs on your computer through Ollama; prompts stay local.</p></div><span className={'pill ' + (serverConfigured ? 'ok' : '')}>{status}</span></div><div className="form-grid"><label>Provider<select value="local" disabled><option value="local">Free local AI (Ollama)</option></select></label><label>Answer language<select value={prefs.language} onChange={e => setPrefs(p => ({ ...p, language: e.target.value }))}><option>English</option><option>Hindi</option><option>Hinglish</option></select></label><label>Answer style<select value={prefs.verbosity} onChange={e => setPrefs(p => ({ ...p, verbosity: e.target.value }))}><option>Concise</option><option>Balanced</option><option>Detailed</option></select></label></div><div className="notice"><LockKeyhole size={17} /><div><b>Free local setup</b><p>Install Ollama on this computer, then run <code>ollama pull qwen2.5:3b</code>. Allow this deployed origin in Ollama’s <code>OLLAMA_ORIGINS</code> setting and restart Ollama. Model generation uses your computer and has no API usage fee.</p><a href="https://ollama.com/download" target="_blank" rel="noreferrer">Download Ollama <ExternalLink size={12} /></a></div></div><div className="actions"><button className="primary" disabled={busy} onClick={check}>{busy ? <LoaderCircle className="spin" /> : <KeyRound size={16} />}Check server connection</button><button className="secondary" onClick={() => setPage('Live Copilot')}>Test an answer</button></div></div><div className="panel"><h2>Privacy & permitted use</h2><p>Question prompts are sent to Ollama running on this computer; the app does not call a paid AI API. TXT, DOCX and selectable PDF extraction runs locally. Uploaded audio transcription is disabled in free mode; use browser Voice practice for a free alternative. The app does not covertly capture microphone or system audio.</p></div></>}{page === 'Live Copilot' && <><div className="page-title"><p className="eyebrow">PRACTICE MODE</p><h1>AI Answer Companion</h1><p>Type a question and generate an answer with free local Ollama AI. This app does not secretly capture call audio.</p></div><DesktopMeetingPanel onQuestion={async (spokenQuestion, visibleScreenText) => {
  const prompt = 'Answer this question from a consenting mock interview. Give a concise, accurate response and include a real-world example or code only when relevant. Prioritize the spoken question; use screen text only as context.\\n\\nSpoken question from system audio:\\n' + spokenQuestion + (visibleScreenText ? '\\n\\nVisible screen/code OCR:\\n' + visibleScreenText : '');
  await ask(prompt, spokenQuestion);
}} /><section className="panel voice-practice"><div className="section-title"><h2><AudioLines />Combined live session</h2><span className={'pill ' + (liveSession ? 'ok' : '')}>{liveSession ? 'SESSION ACTIVE' : 'SESSION OFF'}</span></div><p>Start both inputs together for a consenting mock interview. Choose the meeting tab/window in the browser picker; visible text is OCR-read locally every few seconds while microphone speech recognition listens. When a spoken question is detected after a pause, the local model receives the transcript plus the latest screen text.</p><p><b>Transparent capture:</b> Chrome/Edge shows its native screen-share picker and indicator. This does not hide capture, record system audio, or identify speakers. Browser speech recognition may use browser-provided online services.</p><div className="actions">{!liveSession ? <button className="primary" disabled={capturingScreen || busy || voiceListening} onClick={startLiveSession}>{capturingScreen ? <LoaderCircle className="spin" /> : <ScreenShare size={16} />}{capturingScreen ? 'Starting combined session…' : 'Start voice + screen session'}</button> : <button className="secondary" onClick={stopVoicePractice}><X size={16} />Stop both inputs</button>}<span className="pill">{liveSession ? 'Screen OCR + microphone' : voiceStatus}</span></div>{screenTranscript && <div className="result"><b>Latest visible screen text</b><p>{screenTranscript.slice(0,1800)}</p></div>}</section><section className="panel voice-practice"><div className="section-title"><h2><Mic />Voice practice</h2><span className={'pill ' + (voiceListening ? 'ok' : '')}>{voiceListening ? 'MIC ON' : 'MIC OFF'}</span></div><p>For a consent-based mock interview: start listening, let your friend ask a question in the room, then pause. The browser will transcribe speech and answer question-like phrases after about 1.5 seconds of silence.</p><p><b>Limitations:</b> this uses your microphone, does not identify which person is speaking, and may not hear a remote participant when you use headphones. Speech recognition availability and language support depend on Chrome and browser settings.</p><div className="actions">{!voiceListening ? <button className="primary" onClick={startVoicePractice}><Mic size={16} />Start voice practice</button> : <button className="secondary" onClick={stopVoicePractice}><X size={16} />Stop listening</button>}<span className="pill">{voiceStatus}</span></div>{voiceTranscript && <div className="result"><b>Live transcript</b><p>{voiceTranscript}</p></div>}</section><section className="panel screen-capture-panel"><div className="section-title"><h2><ScreenShare />Read a meeting screen</h2><span className="pill">ONE FRAME</span></div><p>For a consent-based mock interview, choose the meeting tab/window in the browser's screen-share picker. Perry Parrot captures one frame, runs OCR in your browser, and sends the extracted text to your local Ollama model for an answer.</p><p><b>Permission and privacy:</b> the browser will show its normal capture picker and indicator. No hidden or continuous screen recording is performed. This reads visible text only; it does not capture meeting audio or identify speakers.</p><div className="actions"><button className="primary" disabled={capturingScreen || busy} onClick={captureMeetingScreen}>{capturingScreen ? <LoaderCircle className="spin" /> : <ScreenShare size={16} />}{capturingScreen ? 'Capturing and reading…' : 'Capture screen & answer'}</button></div></section><div className="two-col"><section className="panel"><h2><MessageSquare />Ask a question</h2><label className="field-label">Interview question<textarea value={question} onChange={e => setQuestion(e.target.value)} placeholder="How does HashMap work internally in Java?" /></label><div className="actions"><button className="primary" disabled={busy || !question.trim()} onClick={() => ask()}>{busy ? <LoaderCircle className="spin" /> : <Sparkles size={16} />}Generate answer</button><button className="secondary" disabled={!question.trim()} onClick={() => setAudioText(question)}>Use as transcript</button></div><label className="field-label spacer">Question file (TXT, DOCX, PDF)</label><div className="upload"><FileUp /><input type="file" accept=".txt,.md,.docx,.pdf" onChange={e => setFile(e, 'question')} /><span>{fileName || 'Choose a question file (8 MB max)'}</span></div><div className="notice spacer"><Mic size={17} /><div><b>Free audio practice</b><p>Use Voice practice above for browser speech recognition. Audio-file transcription is not included in the free app.</p></div></div>{audioText && <div className="result"><h2>Transcript / input</h2><textarea value={audioText} onChange={e => setAudioText(e.target.value)} /><div className="actions"><button className="secondary" onClick={() => setQuestion(audioText)}>Use transcript as question</button><button className="secondary" onClick={() => ask(audioText)}>Generate answer from transcript <ArrowRight size={14} /></button></div></div>}</section><section className="panel"><div className="section-title"><h2><Sparkles />AI-generated answer</h2><span className="pill">{answer ? 'REAL RESPONSE' : 'AWAITING INPUT'}</span></div>{busy ? <div className="empty"><LoaderCircle className="spin" /><p>Generating response…</p></div> : answer ? <><div className="answer">{answer}</div><div className="actions"><button className="secondary" onClick={() => navigator.clipboard.writeText(answer)}><Copy size={15} />Copy answer</button></div></> : <div className="empty"><MessageSquare /><p>Ask a question to generate an answer.</p><small>Demo text is never passed off as a real result.</small></div>}</section></div></>}{page === 'Interview Prep' && <><div className="page-title"><p className="eyebrow">BE READY FOR THE ROLE</p><h1>Interview Prep</h1><p>Extract a resume and match it to the target job description.</p></div><div className="two-col"><section className="panel"><h2><FileText />Your resume</h2><label className="field-label">Upload resume</label><div className="upload"><Upload /><input type="file" accept=".txt,.md,.docx,.pdf" onChange={e => setFile(e, 'resume')} /><span>{fileName || 'TXT, DOCX or selectable-text PDF (8 MB max)'}</span></div><label className="field-label spacer">Resume text</label><textarea value={resume} onChange={e => setResume(e.target.value)} placeholder="Paste experience, skills, projects…" /></section><section className="panel"><h2><BriefcaseBusiness />Target role</h2><label className="field-label">Job description</label><textarea value={jd} onChange={e => setJd(e.target.value)} placeholder="Paste the role, responsibilities and required skills…" /><button className="primary full spacer" disabled={busy || !resume.trim() || !jd.trim()} onClick={makePrep}>{busy ? <LoaderCircle className="spin" /> : <Sparkles size={15} />}Generate AI preparation plan</button></section></div>{prep && <div className="panel result"><h2><Sparkles />Your preparation plan</h2><pre>{prep}</pre></div>}</>}{page === 'Question Analyzer' && <><div className="page-title"><p className="eyebrow">BREAK DOWN THE QUESTION</p><h1>Question Analyzer</h1><p>Analyze the question text entered or extracted from a file.</p></div><div className="two-col"><section className="panel"><h2><ScanLine />Question input</h2><textarea value={analysisQ} onChange={e => setAnalysisQ(e.target.value)} placeholder="Paste the question to understand…" /><div className="upload spacer"><FileUp /><input type="file" accept=".txt,.md,.docx,.pdf,.png,.jpg,.jpeg,.webp" onChange={e => setFile(e, 'analyzer')} /><span>{fileName || 'TXT, DOCX, text PDF or screenshot'}</span></div><button className="primary full spacer" disabled={busy || !analysisQ.trim()} onClick={analyze}>{busy ? <LoaderCircle className="spin" /> : <Sparkles size={16} />}Analyze question</button></section><section className="panel"><h2><Sparkles />Analysis</h2>{analysis ? <pre className="result-text">{analysis}</pre> : <div className="empty"><BookOpen /><p>Analysis appears after a successful AI response.</p></div>}</section></div></>}{page === 'History' && <><div className="page-title"><p className="eyebrow">YOUR PRACTICE NOTES</p><h1>AI answer history</h1><p>Results stay in this tab until reload.</p></div>{history.length ? <div className="stack">{history.map((h, i) => <article className="panel" key={i}><div className="section-title"><h2>{h.q}</h2><span className="pill">{h.time}</span></div><pre className="result-text">{h.a}</pre><button className="secondary" onClick={() => navigator.clipboard.writeText(h.a)}><Copy size={15} />Copy answer</button></article>)}<button className="secondary" onClick={() => setHistory([])}><Trash2 size={15} />Clear history</button></div> : <div className="panel empty"><History /><p>No generated answers yet.</p></div>}</>}{error && <div className="error global-error" role="alert"><AlertTriangle size={16} />{error}</div>}{notice && <div className="toast"><CheckCircle2 size={17} />{notice}</div>}</div></main></div>;
}
