import { kickoffQardealCoreDeck } from "./kickoff-qardeal-core";
import { statusSemanalQardealCoreDeck } from "./status-semanal-qardeal-core";
import { statusSemanalQardealCore27MayDeck } from "./status-semanal-qardeal-core-27may";
import type { DeckMeta } from "../types";

/** Registro central: añade aquí nuevas presentaciones. */
export const deckRegistry: DeckMeta[] = [
  statusSemanalQardealCore27MayDeck,
  statusSemanalQardealCoreDeck,
  kickoffQardealCoreDeck,
];

export function getDeckById(id: string): DeckMeta | undefined {
  return deckRegistry.find((d) => d.id === id);
}
