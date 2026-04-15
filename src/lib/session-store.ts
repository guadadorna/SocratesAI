export interface SessionData {
  id: string;
  pdfContent: string;
  pdfName: string;
  timeMinutes: number;
  additionalContext?: string;
  startedAt?: number;
  messages: { role: "user" | "assistant"; content: string }[];
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
