'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface VoiceboxStatus {
  connected: boolean;
  message?: string;
  downloadUrl?: string;
  profiles?: Array<{ id: string; name: string; language: string }>;
}

interface CallScript {
  customerName: string;
  contactName: string;
  invoiceNumber: string;
  amount: number;
  daysOverdue: number;
  script: string;
  audioBase64?: string;
  audioUrl?: string;
  status: 'idle' | 'generating-script' | 'generating-audio' | 'ready' | 'error';
  error?: string;
}

const SAMPLE_INVOICES = [
  { customerName: 'Apex Manufacturing LLC', contactName: 'Mike Torres', invoiceNumber: 'INV-2024-0881', amount: 14500, daysOverdue: 45 },
  { customerName: 'BuildRight Construction', contactName: 'Sarah Chen', invoiceNumber: 'INV-2024-0904', amount: 8200, daysOverdue: 32 },
  { customerName: 'Pacific Wholesale Co', contactName: 'James Park', invoiceNumber: 'INV-2024-0923', amount: 22100, daysOverdue: 67 },
  { customerName: 'Cascade Logistics Inc', contactName: 'Linda Ross', invoiceNumber: 'INV-2024-0945', amount: 5800, daysOverdue: 18 },
];

export default function VoicePage() {
  const [status, setStatus] = useState<VoiceboxStatus | null>(null);
  const [companyName, setCompanyName] = useState('Your Company');
  const [selectedProfile, setSelectedProfile] = useState('');
  const [calls, setCalls] = useState<CallScript[]>([]);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkVoicebox();
    // Pre-populate with sample invoices
    setCalls(
      SAMPLE_INVOICES.map((inv) => ({ ...inv, script: '', status: 'idle' as const }))
    );
  }, []);

  async function checkVoicebox() {
    setChecking(true);
    try {
      const res = await fetch('/api/voice');
      const data = await res.json();
      setStatus(data);
      if (data.profiles?.length > 0) setSelectedProfile(data.profiles[0].id);
    } catch {
      setStatus({ connected: false, message: 'Could not reach Voicebox API' });
    } finally {
      setChecking(false);
    }
  }

  async function generateScript(index: number) {
    const call = calls[index];
    setCalls((prev) =>
      prev.map((c, i) => (i === index ? { ...c, status: 'generating-script' } : c))
    );

    const res = await fetch('/api/voice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'generate-script',
        ...call,
        companyName,
      }),
    });
    const data = await res.json();

    setCalls((prev) =>
      prev.map((c, i) =>
        i === index
          ? { ...c, script: data.script || '', status: data.success ? 'idle' : 'error', error: data.error }
          : c
      )
    );
  }

  async function generateAudio(index: number) {
    if (!status?.connected) return;
    const call = calls[index];
    setCalls((prev) =>
      prev.map((c, i) => (i === index ? { ...c, status: 'generating-audio' } : c))
    );

    const res = await fetch('/api/voice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'generate-audio',
        ...call,
        companyName,
        profileId: selectedProfile,
        customScript: call.script || undefined,
      }),
    });
    const data = await res.json();

    setCalls((prev) =>
      prev.map((c, i) =>
        i === index
          ? {
              ...c,
              script: data.script || c.script,
              audioBase64: data.audio?.audio_base64,
              audioUrl: data.audio?.audio_url,
              status: data.success ? 'ready' : 'error',
              error: data.error || data.audio?.error,
            }
          : c
      )
    );
  }

  async function generateAllScripts() {
    for (let i = 0; i < calls.length; i++) {
      await generateScript(i);
    }
  }

  function downloadAudio(call: CallScript) {
    if (!call.audioBase64) return;
    const link = document.createElement('a');
    link.href = `data:audio/wav;base64,${call.audioBase64}`;
    link.download = `call_${call.invoiceNumber}.wav`;
    link.click();
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <header className="border-b border-white/[0.06] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#00e87b] rounded-lg flex items-center justify-center font-bold text-black text-sm">C</div>
            <span className="font-bold text-lg">CashPulse</span>
          </Link>
          <span className="text-white/[0.1]">/</span>
          <span className="text-gray-400">Voice Calls</span>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-6">

        {/* Voicebox Status Card */}
        <div className={`rounded-xl border p-5 mb-6 ${
          status?.connected
            ? 'border-[#00e87b]/30 bg-[#00e87b]/5'
            : 'border-white/[0.1] bg-[#111]'
        }`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${
                checking ? 'bg-yellow-400 animate-pulse' :
                status?.connected ? 'bg-[#00e87b]' : 'bg-red-400'
              }`} />
              <div>
                <p className="font-semibold text-white">
                  {checking ? 'Checking Voicebox...' :
                   status?.connected ? 'Voicebox Connected' : 'Voicebox Not Running'}
                </p>
                <p className="text-sm text-gray-400 mt-0.5">
                  {status?.connected
                    ? `${status.profiles?.length ?? 0} voice profile${(status.profiles?.length ?? 0) !== 1 ? 's' : ''} available â€” powered by Qwen3-TTS`
                    : status?.message ?? 'Launch the Voicebox app to enable AI voice calls'}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {!status?.connected && (
                <a
                  href="https://github.com/jamiepine/voicebox/releases"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm bg-[#222] hover:bg-[#333] px-3 py-1.5 rounded-lg transition"
                >
                  Download Voicebox â†—
                </a>
              )}
              <button
                onClick={checkVoicebox}
                className="text-sm border border-white/[0.1] hover:border-[#555] px-3 py-1.5 rounded-lg transition"
              >
                Refresh
              </button>
            </div>
          </div>

          {/* Profile selector */}
          {status?.connected && status.profiles && status.profiles.length > 0 && (
            <div className="mt-4 flex items-center gap-4">
              <label className="text-sm text-gray-400">Voice Profile:</label>
              <select
                value={selectedProfile}
                onChange={(e) => setSelectedProfile(e.target.value)}
                className="bg-[#0a0a0a] border border-white/[0.1] rounded-lg px-3 py-1.5 text-white text-sm focus:border-[#00e87b] focus:outline-none"
              >
                {status.profiles.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.language})</option>
                ))}
              </select>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-400">Company Name:</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="bg-[#0a0a0a] border border-white/[0.1] rounded-lg px-3 py-1.5 text-white text-sm focus:border-[#00e87b] focus:outline-none w-48"
                />
              </div>
            </div>
          )}
        </div>

        {/* What this does */}
        <div className="bg-[#111] border border-white/[0.06] rounded-xl p-5 mb-6">
          <h2 className="text-lg font-bold mb-2">ðŸŽ™ï¸ How AI Voice Collection Calls Work</h2>
          <div className="grid grid-cols-4 gap-4 text-sm text-gray-400">
            {[
              { step: '1', label: 'Generate Script', desc: 'Qwen3-72B writes a professional, personalized call script for each overdue invoice' },
              { step: '2', label: 'Clone Your Voice', desc: 'Voicebox (Qwen3-TTS) clones your voice from a 5-second sample â€” 100% local, zero cloud' },
              { step: '3', label: 'Generate Audio', desc: 'Your cloned voice reads the script â€” natural prosody, sounds human' },
              { step: '4', label: 'Send or Auto-Dial', desc: 'Download the .wav file or connect Twilio to auto-dial customers' },
            ].map((s) => (
              <div key={s.step} className="text-center">
                <div className="w-8 h-8 bg-[#00e87b] text-black rounded-full flex items-center justify-center font-bold mx-auto mb-2">{s.step}</div>
                <p className="font-medium text-white mb-1">{s.label}</p>
                <p>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bulk Actions */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Collection Calls ({calls.length} invoices)</h2>
          <div className="flex gap-2">
            <button
              onClick={generateAllScripts}
              className="bg-[#111] border border-white/[0.1] hover:border-[#555] text-white px-4 py-2 rounded-lg text-sm transition"
            >
              Generate All Scripts
            </button>
            {status?.connected && (
              <button
                onClick={() => calls.forEach((_, i) => generateAudio(i))}
                className="bg-[#00e87b] text-black font-semibold px-4 py-2 rounded-lg text-sm hover:bg-[#00cc6a] transition"
              >
                Generate All Audio
              </button>
            )}
          </div>
        </div>

        {/* Call Cards */}
        <div className="space-y-4">
          {calls.map((call, i) => (
            <div key={i} className="bg-[#111] border border-white/[0.06] hover:border-white/[0.1] rounded-xl p-5 transition">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-white">{call.customerName}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      call.daysOverdue > 60 ? 'bg-red-500/20 text-red-400' :
                      call.daysOverdue > 30 ? 'bg-orange-500/20 text-orange-400' :
                      'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {call.daysOverdue}d overdue
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {call.invoiceNumber} Â· ${call.amount.toLocaleString()} Â· Contact: {call.contactName}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => generateScript(i)}
                    disabled={call.status === 'generating-script'}
                    className="text-xs border border-white/[0.1] hover:border-[#555] px-3 py-1.5 rounded-lg transition disabled:opacity-50"
                  >
                    {call.status === 'generating-script' ? 'âœ¦ Writing...' : 'âœ¦ Write Script'}
                  </button>
                  <button
                    onClick={() => generateAudio(i)}
                    disabled={!status?.connected || call.status === 'generating-audio'}
                    className="text-xs bg-[#00e87b]/10 border border-[#00e87b]/30 text-[#00e87b] hover:bg-[#00e87b]/20 px-3 py-1.5 rounded-lg transition disabled:opacity-40"
                  >
                    {call.status === 'generating-audio' ? 'ðŸ”Š Recording...' : 'ðŸŽ™ï¸ Generate Audio'}
                  </button>
                  {call.audioBase64 && (
                    <button
                      onClick={() => downloadAudio(call)}
                      className="text-xs bg-[#00e87b] text-black font-semibold px-3 py-1.5 rounded-lg hover:bg-[#00cc6a] transition"
                    >
                      â†“ Download .wav
                    </button>
                  )}
                </div>
              </div>

              {/* Script editor */}
              {call.script && (
                <div className="mt-3">
                  <label className="text-xs text-gray-500 mb-1 block">Call Script (editable)</label>
                  <textarea
                    value={call.script}
                    onChange={(e) => {
                      const newScript = e.target.value;
                      setCalls((prev) => prev.map((c, idx) => idx === i ? { ...c, script: newScript } : c));
                    }}
                    rows={3}
                    className="w-full bg-[#0a0a0a] border border-white/[0.06] rounded-lg px-3 py-2 text-gray-300 text-sm resize-none focus:border-[#00e87b] focus:outline-none"
                  />
                </div>
              )}

              {call.error && (
                <p className="text-red-400 text-xs mt-2">âš  {call.error}</p>
              )}

              {call.status === 'ready' && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="w-2 h-2 bg-[#00e87b] rounded-full" />
                  <span className="text-xs text-[#00e87b]">Audio ready â€” download the .wav to listen or send</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Setup Guide */}
        <div className="mt-8 bg-[#111] border border-white/[0.06] rounded-xl p-6">
          <h3 className="font-bold text-lg mb-4">Voicebox Setup (5 min)</h3>
          <div className="space-y-3 text-sm text-gray-400">
            {[
              { cmd: '1', text: 'Download Voicebox from github.com/jamiepine/voicebox/releases (Windows .msi available)' },
              { cmd: '2', text: 'Install and launch the app â€” it starts a local REST server on port 8000' },
              { cmd: '3', text: 'Go to Voice Profiles â†’ New Profile â†’ upload a 5-10 second audio clip of your voice' },
              { cmd: '4', text: 'Copy your profile ID and add to .env.local: VOICEBOX_PROFILE_ID=your-id-here' },
              { cmd: '5', text: 'Keep Voicebox running when using CashPulse voice features' },
            ].map((s) => (
              <div key={s.cmd} className="flex gap-3">
                <span className="text-[#00e87b] font-mono font-bold">{s.cmd}.</span>
                <span>{s.text}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 bg-[#0a0a0a] rounded-lg p-3 text-xs font-mono text-gray-400">
            # Add to .env.local<br />
            VOICEBOX_API_URL=http://localhost:8000<br />
            VOICEBOX_PROFILE_ID=your-profile-id-from-voicebox-app
          </div>
        </div>
      </div>
    </div>
  );
}
