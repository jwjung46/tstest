import { readSessionFromRequest } from "../oauth/session.ts";
import type { WorkerEnv } from "../env.ts";
import {
  createNote,
  deleteNote,
  getNoteById,
  listNotes,
  updateNote,
} from "./repository.ts";
import type { NoteInput } from "./types.ts";
import { normalizeNoteInput, validateNoteInput } from "./validation.ts";

function jsonResponse(payload: unknown, status = 200) {
  return Response.json(payload, {
    status,
    headers: {
      "cache-control": "no-store",
    },
  });
}

function errorResponse(status: number, code: string, message: string) {
  return jsonResponse(
    {
      error: {
        code,
        message,
      },
    },
    status,
  );
}

async function requireUserId(env: WorkerEnv, request: Request) {
  const session = await readSessionFromRequest(env.AUTH_COOKIE_SECRET, request);
  return session?.user.id ?? null;
}

async function readNoteInput(request: Request): Promise<NoteInput | null> {
  try {
    const payload = await request.json();

    if (!payload || typeof payload !== "object") {
      return null;
    }

    const candidate = payload as Record<string, unknown>;

    if (
      typeof candidate.title !== "string" ||
      typeof candidate.content !== "string"
    ) {
      return null;
    }

    return {
      title: candidate.title,
      content: candidate.content,
    };
  } catch {
    return null;
  }
}

function matchNoteDetailPath(pathname: string) {
  const match = pathname.match(/^\/api\/notes\/([^/]+)$/);
  return match ? decodeURIComponent(match[1]) : null;
}

export async function handleNotesRequest(
  request: Request,
  env: WorkerEnv,
): Promise<Response | null> {
  const url = new URL(request.url);

  if (!url.pathname.startsWith("/api/notes")) {
    return null;
  }

  const userId = await requireUserId(env, request);

  if (!userId) {
    return errorResponse(401, "unauthorized", "Authentication is required.");
  }

  if (url.pathname === "/api/notes") {
    if (request.method === "GET") {
      const notes = await listNotes(env.DB, userId);
      return jsonResponse({ notes });
    }

    if (request.method === "POST") {
      const rawInput = await readNoteInput(request);

      if (!rawInput) {
        return errorResponse(
          400,
          "invalid_request",
          "A valid note payload is required.",
        );
      }

      const input = normalizeNoteInput(rawInput);
      const validation = validateNoteInput(input);

      if (!validation.ok) {
        return errorResponse(400, "validation_error", validation.message);
      }

      const note = await createNote(
        env.DB,
        userId,
        input,
        new Date().toISOString(),
      );

      return jsonResponse({ note }, 201);
    }

    return errorResponse(405, "method_not_allowed", "Method not allowed.");
  }

  const noteId = matchNoteDetailPath(url.pathname);

  if (!noteId) {
    return errorResponse(404, "not_found", "Not found.");
  }

  if (request.method === "GET") {
    const note = await getNoteById(env.DB, noteId, userId);
    return note
      ? jsonResponse({ note })
      : errorResponse(404, "not_found", "Note not found.");
  }

  if (request.method === "PATCH") {
    const rawInput = await readNoteInput(request);

    if (!rawInput) {
      return errorResponse(
        400,
        "invalid_request",
        "A valid note payload is required.",
      );
    }

    const input = normalizeNoteInput(rawInput);
    const validation = validateNoteInput(input);

    if (!validation.ok) {
      return errorResponse(400, "validation_error", validation.message);
    }

    const note = await updateNote(
      env.DB,
      noteId,
      userId,
      input,
      new Date().toISOString(),
    );

    return note
      ? jsonResponse({ note })
      : errorResponse(404, "not_found", "Note not found.");
  }

  if (request.method === "DELETE") {
    const deleted = await deleteNote(env.DB, noteId, userId);
    return deleted
      ? jsonResponse({ ok: true })
      : errorResponse(404, "not_found", "Note not found.");
  }

  return errorResponse(405, "method_not_allowed", "Method not allowed.");
}
