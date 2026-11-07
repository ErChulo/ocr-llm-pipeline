/**
 * Factual JSON extraction must not inherit sampling randomness from chat.
 * Greedy sampling reduces run-to-run variability; it does not guarantee
 * factual accuracy or bit-for-bit output across hardware and model versions.
 */
import type { Settings } from './engine.ts';

export function factualExtractionSettings(settings:Settings):Settings{
  return {...settings,temperature:0,topP:1};
}
