import type { AppState, Profile } from "./types";
import { today } from "./nutrition";

/** Editing weight is an explicit measurement today, not a rewrite of past history. */
export function updateProfile(state: AppState, changes: Partial<Profile>, date = today()): AppState {
  if (!state.profile) return state;
  const weight = changes.startWeight;
  if (weight !== undefined && (!Number.isFinite(weight) || weight < 20 || weight > 400)) return state;
  return {
    ...state,
    profile: { ...state.profile, ...changes },
    weights: weight === undefined ? state.weights : [
      ...state.weights.filter((item) => item.date !== date), { date, weight },
    ].sort((a, b) => a.date.localeCompare(b.date)),
  };
}
