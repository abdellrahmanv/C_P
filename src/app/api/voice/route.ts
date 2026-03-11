import { NextRequest, NextResponse } from 'next/server';
import { generateVoiceScript } from '@/lib/llm';
import { generateCollectionCallAudio, isVoiceboxRunning, listVoiceProfiles } from '@/lib/voicebox';

// GET /api/voice - check Voicebox status + list profiles
export async function GET() {
  const running = await isVoiceboxRunning();

  if (!running) {
    return NextResponse.json({
      connected: false,
      message: 'Voicebox is not running. Launch the desktop app to enable voice calls.',
      downloadUrl: 'https://github.com/jamiepine/voicebox/releases',
    });
  }

  try {
    const profiles = await listVoiceProfiles();
    return NextResponse.json({ connected: true, profiles });
  } catch {
    return NextResponse.json({ connected: true, profiles: [] });
  }
}

// POST /api/voice - generate a voice call script + audio
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      action,
      customerName,
      contactName,
      invoiceNumber,
      amount,
      daysOverdue,
      companyName,
      customScript,
      profileId,
    } = body;

    // Action: generate-script — just generate the text (no audio)
    if (action === 'generate-script') {
      const script = customScript || await generateVoiceScript({
        customerName,
        contactName,
        invoiceNumber,
        amount,
        daysOverdue,
        companyName: companyName || 'your company',
      });

      return NextResponse.json({ success: true, script });
    }

    // Action: generate-audio — generate script + audio via Voicebox
    if (action === 'generate-audio') {
      const script = customScript || await generateVoiceScript({
        customerName,
        contactName,
        invoiceNumber,
        amount,
        daysOverdue,
        companyName: companyName || 'your company',
      });

      const audio = await generateCollectionCallAudio({
        script,
        profileId,
      });

      return NextResponse.json({ success: true, script, audio });
    }

    return NextResponse.json({ error: 'Invalid action. Use generate-script or generate-audio' }, { status: 400 });

  } catch (err) {
    console.error('[/api/voice]', err);
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : 'Voice generation failed',
    }, { status: 500 });
  }
}
