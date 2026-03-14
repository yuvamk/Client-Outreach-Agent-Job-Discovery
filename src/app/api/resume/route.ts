import { NextRequest, NextResponse } from "next/server";
import { parseResumePDF, parseResumeDOCX, analyzeResumeWithGemini } from "@/lib/resumeParser";

// Force Node.js runtime so require() and pdf-parse work correctly
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("resume") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const isPDF = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    const isDOCX =
      file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      file.name.toLowerCase().endsWith(".docx") ||
      file.name.toLowerCase().endsWith(".doc");

    if (!isPDF && !isDOCX) {
      return NextResponse.json(
        { error: "Only PDF and DOCX files are supported" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let resumeText: string;
    try {
      resumeText = isPDF
        ? await parseResumePDF(buffer)
        : await parseResumeDOCX(buffer);
    } catch (parseErr: unknown) {
      const msg = parseErr instanceof Error ? parseErr.message : "Unknown parse error";
      console.error("[resume/route] Text extraction failed:", msg);
      return NextResponse.json(
        { error: msg || "Failed to extract text from resume. Please try a different file." },
        { status: 422 }
      );
    }

    if (!resumeText || resumeText.trim().length < 50) {
      return NextResponse.json(
        { error: "Could not extract enough text from the resume. Ensure it is a text-based (not scanned) file." },
        { status: 422 }
      );
    }

    const profile = await analyzeResumeWithGemini(resumeText);

    return NextResponse.json({
      success: true,
      profile,
      resumeText,
      raw_text_preview: resumeText.slice(0, 300),
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal server error";
    console.error("[resume/route] Unhandled error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
