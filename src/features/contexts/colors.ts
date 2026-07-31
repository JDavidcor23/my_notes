import type { NoteContext } from "@/lib/types";

/**
 * Paleta categórica para los grupos, validada con el script de la skill
 * `dataviz` contra fondo oscuro y con `--pairs all` (en el chat dos grupos
 * cualesquiera pueden quedar uno al lado del otro, no solo los adyacentes):
 *
 *   Lightness band  PASS   todos dentro de L 0.48–0.67
 *   Chroma floor    PASS
 *   CVD separation  PASS   peor par ΔE 13.2 (deuteranopía), piso 8
 *   Normal vision   PASS   peor par ΔE 19.3, piso 15
 *   Contraste       PASS   todos >= 3:1
 *
 * Sin ningún verde a propósito: el verde (--color-accent) ya significa
 * "acción" en esta app y reusarlo para identidad de grupo sería ambiguo.
 */
export const GROUP_COLORS = ["#3987e5", "#c98500", "#d55181"] as const;

/** Sin grupo, y también del 4º grupo en adelante. */
export const NEUTRAL_COLOR = "#8a8a8a";

/**
 * Los colores categóricos se asignan en orden fijo y NO se ciclan: repetir
 * un color diría que dos grupos distintos son el mismo. Del 4º en adelante
 * caen a neutro y se distinguen por su nombre, que siempre está visible.
 *
 * Se ordena por `created_at` ASC para que el color de un contexto no cambie
 * cuando creás otro.
 */
export function buildContextColorMap(
  contexts: NoteContext[],
): Map<string, string> {
  return new Map(
    [...contexts]
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map((c, i) => [c.id, GROUP_COLORS[i] ?? NEUTRAL_COLOR]),
  );
}
