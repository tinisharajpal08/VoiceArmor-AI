import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import VoiceScanner from './components/VoiceScanner';
import LiveProtection from './components/LiveProtection';
import Speakers from './components/Speakers';
import IncidentCenter from './components/IncidentCenter';
import DemoAttackMode from './components/DemoAttackMode';
import PrivacyCenter from './components/PrivacyCenter';
import VerificationModal from './components/VerificationModal';
import AnalyticsView from './components/AnalyticsView';
import { fetchHealth, fetchDashboard, fetchSpeakers } from './utils/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [healthData, setHealthData] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [speakers, setSpeakers] = useState([]);
  
  const [verificationContext, setVerificationContext] = useState(null);

  const loadData = async () => {
    try {
      const [h, d, s] = await Promise.all([
        fetchHealth().catch(() => null),
        fetchDashboard().catch(() => null),
        fetchSpeakers().catch(() => [])
      ]);
      if (h) setHealthData(h);
      if (d) setDashboardData(d);
      if (s) setSpeakers(s);
    } catch (err) {
      console.error("Error fetching initial data:", err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenVerification = (incidentId, riskScore = 50, onResult = null) => {
    setVerificationContext({ incidentId, riskScore, onResult });
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col font-sans">
      
      {/* Navigation Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        healthData={healthData}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Core USP Banner */}
        <div className="mb-6 p-3 rounded-xl bg-slate-900/60 border border-indigo-500/20 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
          <div className="flex items-center space-x-2 text-slate-300">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
            <span className="font-semibold text-white">CORE USP:</span>
            <span className="italic text-indigo-300">"Don't just detect the fake voice — prevent the impersonation attack."</span>
          </div>
          <div className="font-mono text-[11px] text-slate-400 flex items-center space-x-2">
            <span>Core Flow:</span>
            <span className="text-cyan-400 font-bold">🎙️ AUDIO → 🤖 AI → 🔐 VERIFY → ⚠️ RISK → 🛡️ PREVENT</span>
          </div>
        </div>

        {/* View Switcher */}
        {activeTab === 'dashboard' && (
          <Dashboard
            dashboardData={dashboardData}
            onNavigate={(tab) => setActiveTab(tab)}
          />
        )}

        {activeTab === 'scanner' && (
          <VoiceScanner
            speakers={speakers}
            onIncidentCreated={() => loadData()}
            onOpenVerification={handleOpenVerification}
          />
        )}

        {activeTab === 'live' && (
          <LiveProtection
            onOpenVerification={handleOpenVerification}
          />
        )}

        {activeTab === 'speakers' && (
          <Speakers
            speakers={speakers}
            onReloadSpeakers={() => loadData()}
          />
        )}

        {activeTab === 'incidents' && (
          <IncidentCenter />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsView />
        )}

        {activeTab === 'demo' && (
          <DemoAttackMode
            onNavigate={(tab) => setActiveTab(tab)}
          />
        )}

        {activeTab === 'privacy' && (
          <PrivacyCenter />
        )}

      </main>

      {/* Footer */}
      <footer className="bg-[#0b0f19] border-t border-slate-800 py-6 text-center text-xs text-slate-500 space-y-1">
        <div className="font-bold text-slate-300">VoiceArmor AI — Impersonation Detection & Prevention System</div>
        <div>Smart India Hackathon Prototype (Problem ID: SIH26104 • AICTE)</div>
        <div className="text-[10px] font-mono text-slate-600">
          Powered by PyTorch, Librosa acoustic feature engineering, and dynamic 0–100 risk intelligence.
        </div>
      </footer>

      {/* Verification Challenge Modal */}
      {verificationContext && (
        <VerificationModal
          incidentId={verificationContext.incidentId}
          riskScore={verificationContext.riskScore}
          onClose={() => setVerificationContext(null)}
          onResult={(result) => {
            verificationContext.onResult?.(result);
            loadData();
          }}
        />
      )}

    </div>
  );
}
