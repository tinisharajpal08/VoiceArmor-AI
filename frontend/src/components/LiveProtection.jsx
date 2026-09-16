import React, { useState, useEffect } from 'react';
import { Radio, ShieldAlert, Lock, CheckCircle2, AlertOctagon, Activity, Play, RefreshCw } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function LiveProtection({ onOpenVerification }) {
  const [isSimulating, setIsSimulating] = useState(true);
  const [currentRisk, setCurrentRisk] = useState(34);
  const [riskLevel, setRiskLevel] = useState('MODERATE');
  const [actionStatus, setActionStatus] = useState('WARN');
  const [timeline, setTimeline] = useState([
    { time: '00:01', risk: 12 },
    { time: '00:03', risk: 18 },
    { time: '00:05', risk: 34 }
  ]);

  // Simulate rolling live call risk fluctuations
  useEffect(() => {
    if (!isSimulating) return;
    const interval = setInterval(() => {
      const delta = (Math.random() - 0.45) * 12;
      setCurrentRisk((prev) => {
        const next = Math.max(8, Math.min(95, Math.round(prev + delta)));
        let lvl = 'LOW';
        let act = 'MONITOR';
        if (next > 75) { lvl = 'CRITICAL'; act = 'ALERT + RESTRICT SENSITIVE ACTION'; }
        else if (next > 50) { lvl = 'HIGH'; act = 'REQUIRE SECONDARY VERIFICATION'; }
        else if (next > 20) { lvl = 'MODERATE'; act = 'WARN'; }

        setRiskLevel(lvl);
        setActionStatus(act);

        setTimeline((t) => [
          ...t.slice(-10),
          { time: new Date().toLocaleTimeString().slice(3, 8), risk: next }
        ]);

        return next;
      });
    }, 2500);

    return () => clearInterval(interval);
  }, [isSimulating]);

  const triggerAttackSpike = () => {
    setCurrentRisk(92);
    setRiskLevel('CRITICAL');
    setActionStatus('ALERT + RESTRICT SENSITIVE ACTION');
    setTimeline((t) => [
      ...t.slice(-10),
      { time: new Date().toLocaleTimeString().slice(3, 8), risk: 92 }
    ]);
  };

  const handleVerificationResult = ({ outcome, riskScore }) => {
    setCurrentRisk(riskScore);
    const nextLevel = riskScore <= 20 ? 'LOW' : riskScore <= 50 ? 'MODERATE' : riskScore <= 75 ? 'HIGH' : 'CRITICAL';
    const nextAction = riskScore <= 20 ? 'MONITOR' : riskScore <= 50 ? 'WARN' : riskScore <= 75 ? 'REQUIRE SECONDARY VERIFICATION' : 'ALERT + RESTRICT SENSITIVE ACTION';
    setRiskLevel(nextLevel);
    setActionStatus(outcome === 'PASS' ? 'VERIFIED · ' + nextAction : outcome === 'EXPIRED' ? 'CHALLENGE TIMEOUT · ' + nextAction : outcome === 'FAIL' ? 'VERIFICATION_FAILED · ' + nextAction : nextAction);
    setTimeline((t) => [...t.slice(-10), { time: new Date().toLocaleTimeString().slice(3, 8), risk: riskScore }]);
  };

  return (
    <div className="space-y-6">
      
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center space-x-2">
            <Radio className="w-6 h-6 text-rose-500 animate-pulse" />
            <span>Continuous Live Protection Stream</span>
          </h1>
          <p className="text-xs text-slate-400">
            Real-time call center & active voice stream defense. Monitors rolling 2.5s audio chunks.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsSimulating(!isSimulating)}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
              isSimulating
                ? 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
                : 'bg-emerald-600 text-white border-emerald-500'
            }`}
          >
            {isSimulating ? <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isSimulating ? 'Pause Stream' : 'Resume Live Stream'}</span>
          </button>

          <button
            onClick={triggerAttackSpike}
            className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30 transition-all"
          >
            Inject Cloned Voice Attack
          </button>
        </div>
      </div>

      {/* Main Status & Gauge Display */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Risk Gauge Panel (5 cols) */}
        <div className="lg:col-span-5 glass-panel p-6 rounded-2xl border border-slate-800 space-y-6 text-center">
          
          <div className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
            CURRENT LIVE IMPERSONATION RISK
          </div>

          <div className="relative inline-flex items-center justify-center">
            <div className={`w-48 h-48 rounded-full border-8 flex flex-col items-center justify-center transition-all duration-500 ${
              riskLevel === 'CRITICAL' ? 'border-rose-500 shadow-[0_0_40px_rgba(244,63,94,0.4)]' :
              riskLevel === 'HIGH' ? 'border-orange-500 shadow-[0_0_30px_rgba(249,115,22,0.3)]' :
              riskLevel === 'MODERATE' ? 'border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.2)]' :
              'border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
            }`}>
              <span className="text-5xl font-black text-white">{currentRisk}</span>
              <span className="text-xs font-bold text-slate-400 mt-1">/ 100</span>
              <span className={`text-xs font-extrabold px-2 py-0.5 rounded mt-2 ${
                riskLevel === 'CRITICAL' ? 'bg-rose-500/20 text-rose-400' :
                riskLevel === 'HIGH' ? 'bg-orange-500/20 text-orange-400' :
                riskLevel === 'MODERATE' ? 'bg-amber-500/20 text-amber-400' :
                'bg-emerald-500/20 text-emerald-400'
              }`}>
                {riskLevel}
              </span>
            </div>
          </div>

          {/* Action Badge */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 text-left space-y-1">
            <div className="text-[10px] font-mono text-slate-400 uppercase">ACTIVE PREVENTIVE ENFORCEMENT</div>
            <div className="text-sm font-bold text-white flex items-center space-x-2">
              {riskLevel === 'CRITICAL' ? <Lock className="w-4 h-4 text-rose-400" /> : <ShieldAlert className="w-4 h-4 text-amber-400" />}
              <span>{actionStatus}</span>
            </div>
          </div>

          {/* Challenge Verification Trigger */}
          {riskLevel !== 'LOW' && (
            <button
              onClick={() => onOpenVerification && onOpenVerification('INC-LIVE-001', currentRisk, handleVerificationResult)}
              className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg transition-all"
            >
              Issue Challenge Phrase Verification
            </button>
          )}
        </div>

        {/* Real-time Timeline (7 cols) */}
        <div className="lg:col-span-7 glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-200">Real-Time Risk Progression</h2>
            <span className="text-xs font-mono text-cyan-400 animate-pulse">● LIVE STREAM</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeline}>
                <XAxis dataKey="time" stroke="#64748b" fontSize={10} />
                <YAxis domain={[0, 100]} stroke="#64748b" fontSize={10} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff' }} />
                <Line type="monotone" dataKey="risk" stroke="#06b6d4" strokeWidth={3} dot={{ fill: '#06b6d4', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs space-y-2 text-slate-300">
            <div className="font-bold text-slate-200">Enforcement Threshold Rules:</div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>🟢 0–20: Monitor Standard Stream</div>
              <div>🟡 21–50: Warn Security Operator</div>
              <div>🟠 51–75: Secondary Verification Required</div>
              <div>🔴 76–100: Alert + Block Transaction</div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
