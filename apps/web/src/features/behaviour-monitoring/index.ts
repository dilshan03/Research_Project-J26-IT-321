/**
 * Barrel export for the behaviour-monitoring feature.
 *
 * Import everything through this file:
 *   import { useGameplayTracker } from '@/features/behaviour-monitoring';
 */

export { useGameplayTracker } from './useGameplayTracker';
export { createTrackingEngine } from './trackingEngine';
export { createEventBuffer, generateEventId, nowISO } from './eventBuffer';
export type {
  RawGameplayEvent,
  EventType,
  ActionType,
  GameTheme,
  TrackingContext,
  StepTrackingState,
  GameSessionCreate,
  GameSessionResponse,
  EventBatchResponse,
  GameplayTrackerAPI,
  UseGameplayTrackerOptions,
} from './types';
export type { UseGameplayTrackerOptions as UseGameplayTrackerProps } from './useGameplayTracker';
