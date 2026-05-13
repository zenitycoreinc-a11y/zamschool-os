
import { execFile } from "child_process";
import { promisify } from "util";
import { NextResponse } from "next/server";
import { requireUnsafeLocalDevRoute } from "@/lib/dev-route-guard";
import path from "path";

const execFileAsync = promisify(execFile);

export async function GET(req: Request) {
  const blocked = requireUnsafeLocalDevRoute(req);
  if (blocked) {
    return blocked;
  }

  try {
    // Run the script and capture output
    // SECURITY FIX: Use execFile instead of exec to prevent command injection
    // execFile does not spawn a shell, making it immune to shell injection attacks
    const scriptPath = path.join(process.cwd(), "inspect_db.ts");
    const { stdout, stderr } = await execFileAsync("npx", ["tsx", scriptPath], {
      timeout: 30000, // 30 second timeout
      maxBuffer: 10 * 1024 * 1024, // 10MB max buffer
    });
    
    if (stderr && !stdout) {
      return NextResponse.json({ error: stderr }, { status: 500 });
    }

    return NextResponse.json(JSON.parse(stdout));
  } catch (error: any) {
    // Log error details for debugging but don't expose to client
    console.error("[DebugInspect] Error:", error);
    return NextResponse.json(
      { error: "Failed to execute inspection script" },
      { status: 500 }
    );
  }
}
