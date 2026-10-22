import type { Learner } from '../types';
import { AVATAR_OPTIONS } from '../types';

const ACTIVE_STUDENT_STORAGE_KEY = 'mq_active_student_profile';
const STUDENT_PROGRESS_PREFIX = 'mq_student_progress_';

export interface StudentSavedProgress {
  parentId: string;
  learnerId: string;
  studentName: string;
  grade: number;
  stars: number;
  coins: number;
  learningProgressPct: number;
  completedSteps: number[];
  hintAwareKnowledge: number;
  standardKnowledge: number;
  totalHintsUsed: number;
  sessionsCompleted: number;
  lastCognitiveState?: string;
  lastFsmState?: string;
  updatedAt: string;
}

/**
 * Save the active child learner profile selected from the Parent Dashboard (/learners)
 */
export function setActiveStudentProfile(learner: Learner): void {
  try {
    localStorage.setItem(ACTIVE_STUDENT_STORAGE_KEY, JSON.stringify(learner));
  } catch (err) {
    console.warn('Failed to store active student profile in localStorage:', err);
  }
}

/**
 * Retrieve the currently active child learner profile from localStorage
 */
export function getActiveStudentProfile(): Learner | null {
  try {
    const raw = localStorage.getItem(ACTIVE_STUDENT_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Learner;
  } catch {
    return null;
  }
}

/**
 * Helper to resolve avatar metadata for a learner
 */
export function getLearnerAvatar(avatarId?: string) {
  return AVATAR_OPTIONS.find((a) => a.id === avatarId) || AVATAR_OPTIONS[0];
}

/**
 * Build composite storage key using both parentId and learnerId
 */
function getProgressStorageKey(parentId: string, learnerId: string): string {
  return `${STUDENT_PROGRESS_PREFIX}${parentId}__${learnerId}`;
}

/**
 * Load saved gamification & BKT progress for a specific (parentId, learnerId) pair
 */
export function getLocalStudentProgress(
  parentId: string,
  learnerId: string,
  studentName = 'Student',
  grade = 1
): StudentSavedProgress {
  try {
    const key = getProgressStorageKey(parentId, learnerId);
    const raw = localStorage.getItem(key);
    if (raw) {
      return JSON.parse(raw) as StudentSavedProgress;
    }
  } catch {
    // ignore storage read errors
  }

  return {
    parentId,
    learnerId,
    studentName,
    grade,
    stars: 100,
    coins: 50,
    learningProgressPct: 0,
    completedSteps: [],
    hintAwareKnowledge: 0.2,
    standardKnowledge: 0.2,
    totalHintsUsed: 0,
    sessionsCompleted: 0,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Persist gamification & BKT progress for a specific (parentId, learnerId) pair
 * to both localStorage and the Pedagogical Decision API backend.
 */
export async function saveStudentProgress(
  progress: StudentSavedProgress
): Promise<void> {
  try {
    const key = getProgressStorageKey(progress.parentId, progress.learnerId);
    localStorage.setItem(
      key,
      JSON.stringify({
        ...progress,
        updatedAt: new Date().toISOString(),
      })
    );
  } catch (err) {
    console.warn('Failed to write student progress to localStorage:', err);
  }

  try {
    await fetch('/api/telemetry/student-progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...progress,
        studentId: progress.learnerId,
        updatedAt: new Date().toISOString(),
      }),
    });
  } catch {
    // Non-blocking fallback when backend is offline
  }
}

/**
 * Fetch saved student progress from the Pedagogical Decision API backend for (parentId, learnerId)
 */
export async function fetchBackendStudentProgress(
  parentId: string,
  learnerId: string
): Promise<StudentSavedProgress | null> {
  try {
    const params = new URLSearchParams({
      parentId,
      studentId: learnerId,
      learnerId,
    });
    const res = await fetch(`/api/telemetry/student-progress?${params.toString()}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.success && data.progress) {
      const merged: StudentSavedProgress = {
        parentId: data.progress.parentId || parentId,
        learnerId: data.progress.learnerId || data.progress.studentId || learnerId,
        studentName: data.progress.studentName || 'Student',
        grade: data.progress.grade || 1,
        stars: typeof data.progress.stars === 'number' ? data.progress.stars : 100,
        coins: typeof data.progress.coins === 'number' ? data.progress.coins : 50,
        learningProgressPct:
          typeof data.progress.learningProgressPct === 'number'
            ? data.progress.learningProgressPct
            : 0,
        completedSteps: Array.isArray(data.progress.completedSteps)
          ? data.progress.completedSteps
          : [],
        hintAwareKnowledge:
          typeof data.progress.hintAwareKnowledge === 'number'
            ? data.progress.hintAwareKnowledge
            : 0.2,
        standardKnowledge:
          typeof data.progress.standardKnowledge === 'number'
            ? data.progress.standardKnowledge
            : 0.2,
        totalHintsUsed:
          typeof data.progress.totalHintsUsed === 'number' ? data.progress.totalHintsUsed : 0,
        sessionsCompleted:
          typeof data.progress.sessionsCompleted === 'number'
            ? data.progress.sessionsCompleted
            : 0,
        lastCognitiveState: data.progress.lastCognitiveState,
        lastFsmState: data.progress.lastFsmState,
        updatedAt: data.progress.updatedAt || new Date().toISOString(),
      };
      // Sync local cache
      const key = getProgressStorageKey(parentId, learnerId);
      localStorage.setItem(key, JSON.stringify(merged));
      return merged;
    }
  } catch {
    // Fallback to local cache
  }
  return null;
}
