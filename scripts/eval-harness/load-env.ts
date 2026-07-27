import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Next.js carga .env.local automáticamente en su runtime; un script Node
 * suelto no. Esto reemplaza a `dotenv` con un parser mínimo suficiente
 * para las 4 variables que usa este proyecto (ver AGENTS.md / proyecto.md).
 */
export function loadEnvLocal(): void {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) {
    console.warn(`[eval-harness] No se encontró ${path}. Asegurate de correr el script desde la raíz del repo.`);
    return;
  }

  const content = readFileSync(path, "utf-8");
  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const eqIndex = line.indexOf("=");
    if (eqIndex === -1) continue;

    const key = line.slice(0, eqIndex).trim();
    let value = line.slice(eqIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `[eval-harness] Falta la variable de entorno ${name}. Revisá tu .env.local.`
    );
  }
  return value;
}
