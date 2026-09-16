import React, { useEffect, useRef, useState } from 'react';
import { X, Lock, Mic, MicOff } from 'lucide-react';
import { appendChallengeAudit, createChallenge, hashAuditRecord, issuedChallengePhrases, levenshteinRatio, normalizePhrase } from '../utils/challenge';

export default function VerificationModal({ incidentId, riskScore, onClose, onResult }) {
  const challenge = useRef(null);
  const openedAt = useRef(Date.now());
  const recognition = useRef(null);
  const [challengePhrase, setChallengePhrase] = useState('');
  const [responsePhrase, setResponsePhrase] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(30);
  const [speechNotice, setSpeechNotice] = useState('');
  const [result, setResult] = useState(null);

  useEffect(() => {
    challenge.current = createChallenge(issuedChallengePhrases);
    openedAt.current = Date.now();
    setChallengePhrase(challenge.current.phrase);
    const timer = window.setInterval(() => setSecondsRemaining(Math.max(0, Math.ceil((challenge.current.expiresAt - Date.now()) / 1000))), 250);
    return () => { window.clearInterval(timer); recognition.current?.stop(); };
  }, []);

  const getRiskLevel = (score) => score <= 20 ? 'LOW' : score <= 50 ? 'MODERATE' : score <= 75 ? 'HIGH' : 'CRITICAL';
  const getEnforcementAction = (score) => score <= 20 ? 'MONITOR' : score <= 50 ? 'WARN' : score <= 75 ? 'REQUIRE SECONDARY VERIFICATION' : 'ALERT + RESTRICT SENSITIVE ACTION';

  const startRecording = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { setSpeechNotice('Speech recognition is unavailable in this browser. Type the response instead.'); return; }
    const speechRecognition = new SpeechRecognition();
    recognition.current = speechRecognition;
    speechRecognition.lang = 'en-US';
    speechRecognition.interimResults = false;
    speechRecognition.onresult = (event) => setResponsePhrase(event.results[0][0].transcript);
    speechRecognition.onerror = () => setSpeechNotice('Could not transcribe the response. Type it instead or try recording again.');
    speechRecognition.onend = () => setIsRecording(false);
    setSpeechNotice('Listening for the challenge response...');
    setIsRecording(true);
    speechRecognition.start();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('[VoiceArmor] Verify Challenge Response clicked', { responseLength: responsePhrase.trim().length });
    if (!responsePhrase.trim()) return;
    if (isSubmitting) return;

    try {
      if (!challenge.current) throw new Error('Challenge is not ready yet. Please close and reopen the modal.');
      if (challenge.current.attempts >= 2) throw new Error('This challenge has been invalidated after two attempts.');

      setIsSubmitting(true);
      setSpeechNotice('');
      const activeChallenge = challenge.current;
      const responseLatencyMs = Date.now() - openedAt.current;
      activeChallenge.attempts += 1;
      const similarity = levenshteinRatio(normalizePhrase(activeChallenge.phrase), normalizePhrase(responsePhrase));
      const expired = Date.now() > activeChallenge.expiresAt;
      const suspicious = responseLatencyMs < 400;
      let outcome = expired ? 'EXPIRED' : similarity >= 0.9 ? 'PASS' : similarity >= 0.7 ? 'PARTIAL' : 'FAIL';
      if (activeChallenge.attempts >= 2 && outcome === 'PARTIAL') outcome = 'FAIL';
      const riskScoreBefore = Number.isFinite(riskScore) ? riskScore : 50;
      let riskScoreAfter = riskScoreBefore;
      if (outcome === 'PASS') riskScoreAfter -= 25;
      if (outcome === 'FAIL') riskScoreAfter += 30;
      if (outcome === 'EXPIRED') riskScoreAfter += 15;
      if (suspicious) riskScoreAfter += 10;
      riskScoreAfter = Math.max(0, Math.min(100, riskScoreAfter));
      const record = { challengeId: activeChallenge.challengeId, timestamp: new Date().toISOString(), issuedPhrase: activeChallenge.phrase, receivedResponse: responsePhrase, similarityScore: Number(similarity.toFixed(4)), latencyMs: responseLatencyMs, outcome, riskScoreBefore, riskScoreAfter, enforcedAction: getEnforcementAction(riskScoreAfter), incident_id: `CH-${activeChallenge.challengeId.slice(0, 8).toUpperCase()}`, risk_score: riskScoreAfter, risk_level: getRiskLevel(riskScoreAfter), recommended_action: getEnforcementAction(riskScoreAfter), verification_status: outcome === 'PASS' ? 'VERIFIED' : outcome, speaker_name: 'Live Protection Challenge', deepfake_probability: 0, speaker_match_score: null, sensitive_action: 'MONITORING', session_id: 'LIVE-SESSION', audio_hash: '' };
      record.evidenceHash = await hashAuditRecord(record);
      appendChallengeAudit(record);
      setResult({ ...record, suspicious, attempts: activeChallenge.attempts });
      onResult?.({ outcome, riskScore: riskScoreAfter, record });
    } catch (error) {
      console.error('[VoiceArmor] Challenge verification failed', error);
      setResult({ outcome: 'ERROR', message: error instanceof Error ? error.message : 'Challenge verification failed. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resultStyles = { PASS: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', PARTIAL: 'bg-amber-500/20 text-amber-300 border-amber-500/30', FAIL: 'bg-rose-500/20 text-rose-300 border-rose-500/30', EXPIRED: 'bg-rose-500/20 text-rose-300 border-rose-500/30', ERROR: 'bg-rose-500/20 text-rose-300 border-rose-500/30' };
  const canRetry = result?.outcome === 'PARTIAL' && result.attempts < 2;
  if (!challengePhrase) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="glass-panel w-full max-w-md rounded-2xl border border-slate-700 shadow-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2"><Lock className="w-5 h-5 text-amber-400" /><h2 className="text-sm font-extrabold text-white">Secondary Voice Challenge</h2></div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex items-center justify-between text-xs font-mono"><span className="text-slate-400">CHALLENGE EXPIRES IN</span><span className={secondsRemaining <= 5 ? 'text-rose-400 font-bold' : 'text-cyan-300'}>{secondsRemaining}s</span></div>
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-2">
          <div className="text-[10px] text-slate-500 font-mono">REQUIRED VERIFICATION PHRASE</div>
          <div className="text-base font-extrabold text-cyan-300 font-mono bg-slate-950 p-2.5 rounded border border-slate-800">"{challengePhrase}"</div>
          <p className="text-slate-400 text-[11px]">Speak or type the exact phrase before the timer expires.</p>
        </div>
        {speechNotice && <div className="p-2 rounded-lg bg-slate-800 text-slate-300 text-[11px]">{speechNotice}</div>}
        {result && <div className={`p-3 rounded-xl text-xs font-semibold border ${resultStyles[result.outcome]}`}><div>{result.outcome === 'ERROR' ? result.message : result.outcome === 'PASS' ? 'PASS: Challenge verified. Normal monitoring resumed.' : result.outcome === 'PARTIAL' && result.attempts < 2 ? 'PARTIAL: Match is incomplete. You may retry once.' : `FAIL: Challenge ${result.outcome.toLowerCase()}.`}</div>{result.similarityScore !== undefined && <div className="mt-1">Similarity: {Math.round(result.similarityScore * 100)}% | Risk: {result.riskScoreBefore} → {result.riskScoreAfter}</div>}{result.suspicious && <div className="mt-1">Suspicious response latency: {result.latencyMs}ms (+10 risk)</div>}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="text" aria-label="Spoken or typed response phrase" placeholder="Enter response phrase..." value={responsePhrase} onChange={(e) => setResponsePhrase(e.target.value)} disabled={!canRetry && Boolean(result)} className="w-full bg-slate-900 text-slate-200 text-xs rounded-xl px-3.5 py-2.5 border border-slate-800 focus:outline-none focus:border-indigo-500" />
          <div className="flex flex-wrap items-center justify-between gap-2"><button type="button" onClick={startRecording} disabled={isRecording || (!canRetry && Boolean(result))} className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium hover:bg-slate-700 disabled:opacity-50">{isRecording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}<span>{isRecording ? 'Recording...' : 'Record Spoken Response'}</span></button><button type="button" onClick={() => setResponsePhrase(challengePhrase)} disabled={!canRetry && Boolean(result)} className="px-3 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium hover:bg-slate-700 disabled:opacity-50">Auto-Fill Spoken Phrase</button><button type="submit" title={responsePhrase.trim() ? 'Verify the entered challenge response' : 'Enter a response before verifying'} disabled={!responsePhrase.trim()} className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed">Verify Challenge Response</button></div>
        </form>
      </div>
    </div>
  );
}
