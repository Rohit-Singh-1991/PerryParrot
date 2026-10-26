import React, { useEffect, useRef, useState } from 'react';
import { AudioLines, Monitor, RefreshCw, Square, LoaderCircle, ShieldCheck, Sparkles } from 'lucide-react';

type DesktopSource = { id: string; name: string; type: string; thumbnail: string; appIcon: string };
type MeetingPlatform = 'Microsoft Teams' | 'Google Meet' | 'Zoom';
type Props = { onQuestion: (spokenQuestion: string, screenText: string) => Promise<void> | void };
type Asr = (audio: { array: Float32Array; sampling_rate: number }, options?: Record<string, unknown>) => Promise<{ text?: string }>;


export default function DesktopMeetingPanel({ onQuestion }: Props) {
  const desktop = Boolean(window.perryParrotDesktop?.isDesktop);
  const [sources, setSources] = useState<DesktopSource[]>([]);
  const [platform, setPlatform] = useState<MeetingPlatform>('Microsoft Teams');
  const [sourceId, setSourceId] = useState('');
  const [active, setActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(desktop ? 'Choose the meeting display to begin' : 'Available in the Windows desktop app');
  const [transcript, setTranscript] = useState('');
  const [screenText, setScreenText] = useState('');
  const screenTextRef = useRef('');
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const workerRef = useRef<any>(null);
  const asrRef = useRef<Asr | null>(null);
  const timerRef = useRef<number | null>(null);
  const activeRef = useRef(false);
  const scanningRef = useRef(false);
  const submittedRef = useRef('');
  const recorderRef = useRef<MediaRecorder | null>(null);
  const cycleTimerRef = useRef<number | null>(null);
  const onQuestionRef = useRef(onQuestion);
  onQuestionRef.current = onQuestion;

  const refreshSources = async () => {
    if (!window.perryParrotDesktop) return;
    try {
      const result = await window.perryParrotDesktop.listSources();
      setSources(result);
      if (!sourceId && result.length) {
        const suggested = result.find(s => platformMatches(platform, s.name));
        setSourceId(suggested?.id || result.find(s => s.type === 'screen')?.id || result[0].id);
      }
      setStatus(result.length ? 'Select the meeting screen/window, then start capture' : 'No shareable windows found. Open the meeting first.');
    } catch (error) {
      setStatus('Could not list desktop sources: ' + (error instanceof Error ? error.message : 'unknown error'));
    }
  };

  const platformMatches = (target: MeetingPlatform, name: string) => {
    const value = name.toLowerCase();
    if (target === 'Microsoft Teams') return /microsoft teams|teams meeting|\bteams\b/.test(value);
    if (target === 'Google Meet') return /google meet|meet\.google\.com|\bmeet\b/.test(value);
    return /zoom meeting|zoom workplace|\bzoom\b/.test(value);
  };

  const choosePlatform = (next: MeetingPlatform) => {
    setPlatform(next);
    const match = sources.find(source => platformMatches(next, source.name));
    if (match) {
      setSourceId(match.id);
      setStatus('Suggested source for ' + next + ': ' + match.name + '. Verify the source, then start capture.');
    } else {
      setSourceId('');
      setStatus('No obvious ' + next + ' window title found. The previous source was cleared; choose the full screen or the correct meeting window manually. Platform selection does not connect an official meeting API.');
    }
  };

  const transcribeBlob = async (blob: Blob) => {
    if (!asrRef.current || blob.size < 1200 || !activeRef.current) return;
    try {
      const audioContext = new AudioContext();
      try {
        const decoded = await audioContext.decodeAudioData(await blob.arrayBuffer());
        const length = Math.ceil(decoded.duration * 16000);
        if (!length) return;
        const offline = new OfflineAudioContext(1, length, 16000);
        const source = offline.createBufferSource();
        source.buffer = decoded;
        source.connect(offline.destination);
        source.start();
        const resampled = await offline.startRendering();
        const samples = resampled.getChannelData(0);
        const result = await asrRef.current({ array: samples, sampling_rate: 16000 }, { language: 'english', task: 'transcribe' });
        const text = (result.text || '').trim();
        if (!text || !activeRef.current) return;
        setTranscript(current => (current + ' ' + text).trim().slice(-6000));
        setStatus('Local transcription active · checking for a question');
        const looksLikeQuestion = /\?|\b(what|why|how|when|where|who|which|explain|define|describe|compare|difference|can you|could you|tell me|write|implement|solve|walk me through)\b/i.test(text);
        const normalized = text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
        if (looksLikeQuestion && normalized.length > 12 && normalized !== submittedRef.current) {
          submittedRef.current = normalized;
          setStatus('Question detected · generating answer from speech + screen');
          void onQuestionRef.current(text, screenTextRef.current);
        }
      } finally {
        await audioContext.close().catch(() => {});
      }
    } catch (error) {
      setStatus('Audio chunk could not be decoded; retrying: ' + (error instanceof Error ? error.message : 'unknown error'));
    }
  };

  const startAudioCycle = () => {
    if (!activeRef.current || !streamRef.current?.getAudioTracks().length) return;
    try {
      const audioStream = new MediaStream(streamRef.current.getAudioTracks());
      const recorder = new MediaRecorder(audioStream);
      recorderRef.current = recorder;
      const chunks: Blob[] = [];
      recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      recorder.onstop = async () => {
        if (activeRef.current && chunks.length) await transcribeBlob(new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }));
        if (activeRef.current) cycleTimerRef.current = window.setTimeout(startAudioCycle, 100);
      };
      recorder.start();
      cycleTimerRef.current = window.setTimeout(() => {
        if (recorder.state === 'recording') recorder.stop();
      }, 6000);
    } catch (error) {
      setStatus('Could not start desktop audio recording: ' + (error instanceof Error ? error.message : 'unknown error'));
      stopSession();
    }
  };

  const scanScreen = async () => {
    if (scanningRef.current || !videoRef.current || !workerRef.current || !activeRef.current) return;
    scanningRef.current = true;
    const canvas = document.createElement('canvas');
    try {
      const video = videoRef.current;
      if (!video.videoWidth || !video.videoHeight) return;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (!context) return;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const result = await workerRef.current.recognize(canvas);
      const text = (result.data.text || '').trim().slice(0, 10000);
      if (text && text !== screenTextRef.current) {
        screenTextRef.current = text;
        setScreenText(text);
        setStatus('Screen OCR refreshed · local processing');
      }
    } catch {
      setStatus('Screen OCR will retry on the next frame');
    } finally {
      canvas.width = 0;
      canvas.height = 0;
      scanningRef.current = false;
    }
  };

  const startSession = async () => {
    if (!window.perryParrotDesktop || !sourceId) return;
    setBusy(true);
    let pendingStream: MediaStream | null = null;
    let pendingWorker: any = null;
    setStatus('Loading free local speech model (first launch downloads model files)…');
    try {
      if (!asrRef.current) {
        const { pipeline } = await import('@huggingface/transformers');
        asrRef.current = await pipeline('automatic-speech-recognition', 'onnx-community/whisper-tiny.en', { device: 'cpu' }) as unknown as Asr;
      }
      setStatus('Requesting the selected display and system audio…');
      const constraints = {
        audio: { mandatory: { chromeMediaSource: 'desktop' } },
        video: { mandatory: { chromeMediaSource: 'desktop', chromeMediaSourceId: sourceId, maxWidth: 1600, maxHeight: 900, maxFrameRate: 2 } }
      } as unknown as MediaStreamConstraints;
      pendingStream = await navigator.mediaDevices.getUserMedia(constraints);
      const stream = pendingStream;
      if (!stream.getAudioTracks().length) {
        stream.getTracks().forEach(track => track.stop());
        throw new Error('This source did not provide system audio for ' + platform + '. On Windows, select the full screen and ensure meeting audio is playing. Platform audio availability depends on the OS and source.');
      }
      const video = document.createElement('video');
      video.muted = true;
      video.srcObject = stream;
      await video.play();
      const { createWorker } = await import('tesseract.js');
      pendingWorker = await createWorker('eng');
      const worker = pendingWorker;
      streamRef.current = stream;
      videoRef.current = video;
      workerRef.current = worker;
      pendingStream = null;
      pendingWorker = null;
      activeRef.current = true;
      setActive(true);
      setBusy(false);
      setStatus('Live desktop capture active · system audio + screen OCR');
      stream.getTracks().forEach(track => track.addEventListener('ended', stopSession, { once: true }));
      await scanScreen();
      timerRef.current = window.setInterval(() => { void scanScreen(); }, 5000);
      startAudioCycle();
    } catch (error) {
      pendingStream?.getTracks().forEach(track => track.stop());
      if (pendingWorker) await pendingWorker.terminate().catch(() => {});
      stopSession();
      setBusy(false);
      setStatus('Could not start live capture: ' + (error instanceof Error ? error.message : 'unknown error'));
    }
  };

  function stopSession() {
    activeRef.current = false;
    setActive(false);
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    if (cycleTimerRef.current !== null) window.clearTimeout(cycleTimerRef.current);
    timerRef.current = null;
    cycleTimerRef.current = null;
    try { if (recorderRef.current?.state === 'recording') recorderRef.current.stop(); } catch { /* already stopped */ }
    recorderRef.current = null;
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    if (videoRef.current) { videoRef.current.pause(); videoRef.current.srcObject = null; videoRef.current = null; }
    if (workerRef.current) { void workerRef.current.terminate().catch(() => {}); workerRef.current = null; }
    screenTextRef.current = '';
    setScreenText('');
    setStatus('Capture stopped');
  }

  useEffect(() => {
    if (desktop) void refreshSources();
    return () => {
      activeRef.current = false;
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
      if (cycleTimerRef.current !== null) window.clearTimeout(cycleTimerRef.current);
      try { if (recorderRef.current?.state === 'recording') recorderRef.current.stop(); } catch { /* ignore */ }
      streamRef.current?.getTracks().forEach(track => track.stop());
      if (workerRef.current) void workerRef.current.terminate().catch(() => {});
    };
  // Refresh only when this panel mounts.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [desktop]);

  return <section className="panel desktop-session">
    <div className="section-title"><h2><Monitor />Desktop live meeting session</h2><span className={'pill ' + (active ? 'ok' : '')}>{active ? 'CAPTURING' : desktop ? 'DESKTOP' : 'DESKTOP ONLY'}</span></div>
    <p>Choose Teams, Google Meet, or Zoom as the meeting context, then select the matching meeting window or full display. The platform choice only helps pick a likely source; this build uses Windows/Electron desktop loopback capture plus visible screen OCR, not official Teams/Meet/Zoom APIs. Audio availability must be verified on this PC for each platform. Both inputs are processed locally; detected questions go to your local Ollama model.</p>
    {!desktop ? <div className="notice"><ShieldCheck size={17}/><div><b>Windows desktop app required</b><p>This capability uses OS-level capture APIs and is intentionally unavailable in the browser build.</p></div></div> : <>
      <div className="actions">
        <select aria-label="Meeting platform" value={platform} disabled={active || busy} onChange={event => choosePlatform(event.target.value as MeetingPlatform)}>
          <option>Microsoft Teams</option><option>Google Meet</option><option>Zoom</option>
        </select>
        <select aria-label="Meeting display" value={sourceId} disabled={active || busy} onChange={event => setSourceId(event.target.value)} style={{flex:1,minWidth:180}}>
          <option value="">Choose screen/window…</option>
          {sources.map(source => <option key={source.id} value={source.id}>{source.type === 'screen' ? 'Screen' : 'Window'} — {source.name}</option>)}
        </select>
        <button className="secondary" disabled={active || busy} onClick={() => void refreshSources()}><RefreshCw size={15}/>Refresh</button>
        {!active ? <button className="primary" disabled={busy || !sourceId} onClick={() => void startSession()}>{busy ? <LoaderCircle className="spin" size={15}/> : <AudioLines size={15}/>}Start capture</button> : <button className="secondary" onClick={stopSession}><Square size={15}/>Stop capture</button>}<button className="secondary" disabled={!desktop} onClick={() => void window.perryParrotDesktop?.showAnswerWindow()}><Sparkles size={15}/>Open answer window</button>
      </div>
      <div className="notice spacer"><ShieldCheck size={17}/><div><b>Visible, permission-based capture</b><p>Selected context: {platform}. Capture is shown in the desktop app and stops when you press Stop or close the selected source. No hidden recording or participant-concealment mode is provided. The English Whisper model downloads on first use and then runs locally.</p></div></div>
      <div className="two-col spacer">
        <div className="result"><div className="label">Latest local transcript</div><p>{transcript || 'Waiting for speech…'}</p></div>
        <div className="result"><div className="label">Latest screen text (OCR)</div><p>{screenText || 'Waiting for readable screen text…'}</p></div>
      </div>
    </>}
    <p className="muted">{status}</p>
  </section>;
}
