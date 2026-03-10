import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    // Verify cron secret to prevent unauthorized access
    const cronSecret = request.headers.get("x-cron-secret");
    const expectedSecret = process.env.CRON_SECRET;

    if (expectedSecret && cronSecret !== expectedSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    switch (action) {
      case "scout": {
        // Find new leads via Apollo
        const scoutResponse = await fetch(
          new URL("/api/scout", request.url).toString(),
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
          }
        );
        const scoutData = await scoutResponse.json();
        return NextResponse.json({
          action: "scout",
          result: `Found ${scoutData.count} leads`,
          data: scoutData,
        });
      }

      case "send-sequence": {
        // Process leads that need next sequence email
        // In production, this reads from DB and sends queued emails
        return NextResponse.json({
          action: "send-sequence",
          result: "Sequence emails processed",
          sent: 0,
          message: "Connect database to enable automated sequences",
        });
      }

      case "check-replies": {
        // Check for replies and update lead status
        return NextResponse.json({
          action: "check-replies",
          result: "Reply check completed",
          newReplies: 0,
          message: "Connect email provider to enable reply tracking",
        });
      }

      case "daily-report": {
        // Generate daily sales report
        return NextResponse.json({
          action: "daily-report",
          result: "Daily report generated",
          message: "Full reporting available with database connection",
        });
      }

      default:
        return NextResponse.json(
          { error: "Unknown action. Use: scout, send-sequence, check-replies, daily-report" },
          { status: 400 }
        );
    }
  } catch {
    return NextResponse.json(
      { error: "Automation error" },
      { status: 500 }
    );
  }
}
