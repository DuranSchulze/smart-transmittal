import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { auth, db } from "@/server/auth";
import {
  encryptUserGeminiApiKey,
  getSystemDefaultGeminiModel,
  getUserAiKeyMetadata,
  isLikelyGeminiApiKey,
} from "@/server/user-ai-settings";
import { normalizeGeminiModel } from "@/lib/gemini-models";

export const runtime = "nodejs";
export const maxDuration = 15;

const authenticate = async (request: Request) => {
  const session = await auth.api.getSession({
    headers: request.headers as any,
  });

  if (!session?.user?.id) {
    return null;
  }

  return session.user;
};

export async function GET(request: Request) {
  try {
    const user = await authenticate(request);
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const metadata = await getUserAiKeyMetadata(user.id);
    return NextResponse.json(metadata);
  } catch (error: any) {
    console.error("Get user AI settings error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await authenticate(request);
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const geminiApiKey = String(body?.geminiApiKey || "").trim();
    const hasModelField = body?.geminiModel !== undefined && body?.geminiModel !== null;
    const geminiModel = hasModelField
      ? normalizeGeminiModel(String(body.geminiModel))
      : null;

    if (hasModelField && !geminiModel) {
      return NextResponse.json(
        { error: "Unsupported Gemini model." },
        { status: 400 },
      );
    }

    if (!geminiApiKey && !geminiModel) {
      return NextResponse.json(
        { error: "Provide a Gemini API key or a model to save." },
        { status: 400 },
      );
    }

    if (geminiApiKey && !isLikelyGeminiApiKey(geminiApiKey)) {
      return NextResponse.json(
        { error: "Gemini API key format looks invalid." },
        { status: 400 },
      );
    }

    const encrypted = geminiApiKey
      ? encryptUserGeminiApiKey(geminiApiKey)
      : undefined;

    let warning: string | undefined;
    if (geminiApiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey: geminiApiKey });
        await ai.models.generateContent({
          model: geminiModel || getSystemDefaultGeminiModel(),
          contents: "Ping",
          config: { maxOutputTokens: 8, temperature: 0 },
        });
      } catch {
        warning =
          "Key was saved, but live validation failed. It may be invalid, restricted, or temporarily unavailable.";
      }
    }

    const mutations = {
      ...(encrypted ? { geminiApiKeyEncrypted: encrypted } : {}),
      ...(geminiModel ? { geminiModel } : {}),
    };

    await db.userAiSettings.upsert({
      where: { userId: user.id },
      create: { userId: user.id, ...mutations },
      update: mutations,
    });

    const metadata = await getUserAiKeyMetadata(user.id);

    return NextResponse.json({ ok: true, warning, ...metadata });
  } catch (error: any) {
    console.error("Save user AI settings error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await authenticate(request);
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const existing = await db.userAiSettings.findUnique({
      where: { userId: user.id },
      select: { geminiModel: true },
    });

    if (existing?.geminiModel) {
      // Keep the row (and the model preference) but drop the personal key.
      await db.userAiSettings.update({
        where: { userId: user.id },
        data: { geminiApiKeyEncrypted: null },
      });
    } else {
      await db.userAiSettings.deleteMany({
        where: { userId: user.id },
      });
    }

    const metadata = await getUserAiKeyMetadata(user.id);

    return NextResponse.json({ ok: true, ...metadata });
  } catch (error: any) {
    console.error("Delete user AI settings error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
