import React, { useState, useEffect } from 'react';
import { AlertTriangle, Filter, Download, Eye, Trash2, FileText } from 'lucide-react';
import { fetchIncidents, downloadIncidentReport, clearIncidents } from '../utils/api';
import { clearChallengeAudit, readChallengeAudit } from '../utils/challenge';
import IncidentDetailModal from './IncidentDetailModal';

export default function IncidentCenter() {
  const [incidents, setIncidents] = useState([]);
  const [filterLevel, setFilterLevel] = useState('ALL');
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const mergeChallengeAudit = (serverIncidents) => {
    const localIncidents = readChallengeAudit().map((record) => ({ ...record, timestamp: record.timestamp, incident_id: record.incident_id, deepfake_probability: 0, risk_score: record.riskScoreAfter, risk_level: record.risk_level, recommended_action: record.enforcedAction, verification_status: record.outcome, explanations: [`Challenge phrase: ${record.issuedPhrase}`, `Response similarity: ${Math.round(record.similarityScore * 100)}%`, `Latency: ${record.latencyMs}ms`, `Evidence hash: ${record.evidenceHash}`], audio_hash: record.evidenceHash }));
    return [...localIncidents, ...serverIncidents];
  };

  const loadIncidents = async () => {
    setIsLoading(true);
    try {
      const data = await fetchIncidents(filterLevel);
      setIncidents(mergeChallengeAudit(data));
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadIncidents();
    const refresh = () => loadIncidents();
    window.addEventListener('voicearmor:challenge-audit', refresh);
    return () => window.removeEventListener('voicearmor:challenge-audit', refresh);
  }, [filterLevel]);

  const handleClearAll = async () => {
    if (!window.confirm("Clear all incident logs from system memory?")) return;
    try {
      await clearIncidents();
      clearChallengeAudit();
      loadIncidents();
    } catch (err) {
      alert("Failed to clear incidents.");
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Incident Center & Forensic Reports</h1>
          <p className="text-xs text-slate-400">
            Audit trail of high-risk voice cloning impersonation attempts with SHA-256 evidence integrity verification.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Level Filter */}
          <div className="flex items-center space-x-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
            {['ALL', 'LOW', 'MODERATE', 'HIGH', 'CRITICAL'].map((lvl) => (
              <button
                key={lvl}
                onClick={() => setFilterLevel(lvl)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filterLevel === lvl ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>

          <button
            onClick={handleClearAll}
            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-400 hover:border-rose-500/40 text-xs font-medium"
          >
            Clear Log
          </button>
        </div>
      </div>

      {/* Incidents Table */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800 uppercase font-mono">
              <tr>
                <th className="py-3.5 px-4">Incident ID</th>
                <th className="py-3.5 px-4">Timestamp</th>
                <th className="py-3.5 px-4">Target Speaker</th>
                <th className="py-3.5 px-4">Deepfake Prob</th>
                <th className="py-3.5 px-4">Risk Score</th>
                <th className="py-3.5 px-4">Risk Level</th>
                <th className="py-3.5 px-4">Enforced Action</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {incidents.length > 0 ? (
                incidents.map((inc) => {
                  const isCrit = inc.risk_level === 'CRITICAL';
                  return (
                    <tr key={inc.incident_id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-indigo-300">{inc.incident_id}</td>
                      <td className="py-3.5 px-4 text-slate-400">{new Date(inc.timestamp).toLocaleString()}</td>
                      <td className="py-3.5 px-4 font-semibold text-slate-200">{inc.speaker_name}</td>
                      <td className="py-3.5 px-4 font-bold text-rose-400">{inc.deepfake_probability}%</td>
                      <td className="py-3.5 px-4 font-black text-white">{inc.risk_score} / 100</td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isCrit ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                          inc.risk_level === 'HIGH' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                          'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}>
                          {inc.risk_level}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-300">{inc.recommended_action}</td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => setSelectedIncident(inc)}
                            className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition-colors"
                            title="View Incident Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => downloadIncidentReport(inc.incident_id, 'pdf')}
                            className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 transition-colors"
                            title="Download PDF Incident Report"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-500 text-xs">
                    No incident records match the selected filter level ({filterLevel}).
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal View */}
      {selectedIncident && (
        <IncidentDetailModal
          incident={selectedIncident}
          onClose={() => setSelectedIncident(null)}
        />
      )}

    </div>
  );
}
