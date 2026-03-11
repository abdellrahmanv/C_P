/**
 * Voicebox Integration
 * 
 * Voicebox is a local-first, open-source ElevenLabs alternative.
 * GitHub: https://github.com/jamiepine/voicebox
 * Powered by: Qwen3-TTS (Alibaba) — near-perfect voice cloning
 * 
 * Setup:
 *   1. Download from https://github.com/jamiepine/voicebox/releases
 *   2. Install and launch the desktop app
 *   3. Enable API in Settings → enable REST API (runs on port 8000 by default)
 *   4. Clone your voice: upload a 5-10s audio sample
 *   5. Copy the profile_id and set VOICEBOX_PROFILE_ID in .env.local
 *   6. Set VOICEBOX_API_URL=http://localhost:8000
 * 
 * For production / cloud deployment:
 *   - Run Voicebox backend on a GPU server
 *   - Set VOICEBOX_API_URL to the server address
 *   - Or use Voicebox's "Remote Mode" — turn any machine into a Voicebox server
 */

const VOICEBOX_URL = process.env.VOICEBOX_API_URL || 'http://localhost:8000';

export interface VoiceProfile {
  id: string;
  name: string;
  language: string;
  sample_count: number;
}

export interface GenerateAudioParams {
  text: string;
  profile_id: string;
  language?: string;
  speed?: number;
}

export interface GenerateAudioResult {
  success: boolean;
  audio_url?: string;   // URL to the generated .wav file on the Voicebox server
  audio_base64?: string; // Or base64 encoded audio
  duration_seconds?: number;
  error?: string;
}

// ============================================================
// CONNECTION CHECK
// ============================================================

export async function isVoiceboxRunning(): Promise<boolean> {
  try {
    const res = await fetch(`${VOICEBOX_URL}/health`, {
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ============================================================
// VOICE PROFILES
// ============================================================

export async function listVoiceProfiles(): Promise<VoiceProfile[]> {
  const res = await fetch(`${VOICEBOX_URL}/profiles`);
  if (!res.ok) throw new Error('Failed to fetch Voicebox profiles');
  const data = await res.json();
  return data.profiles ?? data ?? [];
}

export async function createVoiceProfile(params: {
  name: string;
  language?: string;
  audioFile?: Blob; // Optional: upload a voice sample immediately
}): Promise<VoiceProfile> {
  const res = await fetch(`${VOICEBOX_URL}/profiles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: params.name,
      language: params.language ?? 'en',
    }),
  });
  if (!res.ok) throw new Error('Failed to create voice profile');
  return res.json();
}

// ============================================================
// GENERATE SPEECH
// ============================================================

export async function generateSpeech(params: GenerateAudioParams): Promise<GenerateAudioResult> {
  try {
    const profileId = params.profile_id || process.env.VOICEBOX_PROFILE_ID || '';

    if (!profileId) {
      return {
        success: false,
        error: 'No Voicebox profile ID set. Add VOICEBOX_PROFILE_ID to .env.local',
      };
    }

    const res = await fetch(`${VOICEBOX_URL}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: params.text,
        profile_id: profileId,
        language: params.language ?? 'en',
        speed: params.speed ?? 1.0,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return { success: false, error: `Voicebox error: ${err}` };
    }

    // Voicebox returns audio as binary or JSON with URL
    const contentType = res.headers.get('content-type') ?? '';

    if (contentType.includes('audio')) {
      // Direct audio binary response
      const blob = await res.blob();
      const buffer = await blob.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');
      return {
        success: true,
        audio_base64: base64,
      };
    } else {
      // JSON response with audio URL
      const json = await res.json();
      return {
        success: true,
        audio_url: json.audio_url ?? json.url,
        duration_seconds: json.duration,
      };
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Voicebox unavailable',
    };
  }
}

// ============================================================
// COLLECTION CALL AUDIO GENERATOR
// ============================================================

export interface CollectionCallParams {
  script: string;
  profileId?: string;
  language?: string;
}

export async function generateCollectionCallAudio(
  params: CollectionCallParams
): Promise<GenerateAudioResult> {
  const running = await isVoiceboxRunning();
  if (!running) {
    return {
      success: false,
      error: 'Voicebox is not running. Launch the Voicebox app first.',
    };
  }

  return generateSpeech({
    text: params.script,
    profile_id: params.profileId ?? process.env.VOICEBOX_PROFILE_ID ?? '',
    language: params.language ?? 'en',
    speed: 0.95, // Slightly slower = clearer for business calls
  });
}

// ============================================================
// BATCH: GENERATE AUDIO FOR MULTIPLE INVOICES
// ============================================================

export interface BatchCallResult {
  contactName: string;
  customerName: string;
  invoiceNumber: string;
  amount: number;
  script: string;
  audio: GenerateAudioResult;
}

export async function batchGenerateCollectionCalls(
  calls: Array<{
    contactName: string;
    customerName: string;
    invoiceNumber: string;
    amount: number;
    script: string;
  }>
): Promise<BatchCallResult[]> {
  const results: BatchCallResult[] = [];

  for (const call of calls) {
    const audio = await generateCollectionCallAudio({ script: call.script });
    results.push({ ...call, audio });

    // Small delay to avoid overwhelming local server
    await new Promise((r) => setTimeout(r, 500));
  }

  return results;
}
