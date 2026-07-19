import type { Persona } from "@/lib/db/schema";
import type { PersonaPublic } from "./types";

/** Convert display name to URL-safe slug. */
export function slugifyPersonaName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

/** Convert DB row to API-safe persona object. */
export function toPublicPersona(persona: Persona): PersonaPublic {
  return {
    id: persona.id,
    name: persona.name,
    slug: persona.slug,
    description: persona.description,
    instructions: persona.instructions,
    defaultTolerances: persona.defaultTolerances,
    defaultEnabledChecks: persona.defaultEnabledChecks,
    enabled: persona.enabled,
    createdAt: persona.createdAt.toISOString(),
    updatedAt: persona.updatedAt.toISOString(),
  };
}
