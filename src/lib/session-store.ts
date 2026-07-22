import { v4 as uuidv4 } from "uuid";

export interface Demographic {
  gender: string;
  career: string;
  year: number;
}

export interface SessionData {
  id: string;
  pdfContent: string;
  pdfName: string;
  timeMinutes: number;
  practiceMode?: boolean;
  additionalContext?: string;
  startedAt?: number;
  endedAt?: number;
  messages: { role: "user" | "assistant"; content: string }[];
  demographic?: Demographic;
  professorId?: string;
  subjectId?: string;
}

const SESSION_KEY = "socrates_session";

export function saveSession(session: SessionData): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }
}

export function getSession(): SessionData | null {
  if (typeof window !== "undefined") {
    const data = localStorage.getItem(SESSION_KEY);
    if (data) {
      return JSON.parse(data);
    }
  }
  return null;
}

export function clearSession(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(SESSION_KEY);
  }
}

const ANON_ID_KEY = "socrates_anon_id";

export function getOrCreateAnonId(): string | null {
  if (typeof window === "undefined") return null;
  let anonId = localStorage.getItem(ANON_ID_KEY);
  if (!anonId) {
    anonId = uuidv4();
    localStorage.setItem(ANON_ID_KEY, anonId);
  }
  return anonId;
}
