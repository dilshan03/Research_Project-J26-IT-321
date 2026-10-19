import { parentText } from '../../../../shared/i18n/parentText';
import type { DeletionRequestStatus, OnboardingStatus } from '../../types';

/** Display label for a stored language value; unknown values are shown unchanged. */
export const languageLabel = (value?: string | null): string => {
  if (!value) return parentText.languages.Sinhala;
  const label = (parentText.languages as Record<string, unknown>)[value];
  return typeof label === 'string' ? label : value;
};

/** Display label for a stored comprehension value (stored English values are not changed). */
export const comprehensionLabel = (value?: string | null): string =>
  value ? ((parentText.comprehension as Record<string, string>)[value] ?? value) : '';

export const statusLabel = (status: OnboardingStatus): string =>
  parentText.status[status] ?? parentText.status.NOT_STARTED;

export const deletionStatusLabel = (status: DeletionRequestStatus): string =>
  `${parentText.deletionStatus.prefix}: ${parentText.deletionStatus[status] ?? status}`;

type OptionGroup = Record<string, { title: string; desc: string } | string>;

/** Title for a stored preference/social-context option value; unknown values are shown unchanged. */
export const optionTitle = (group: OptionGroup, value?: string | null): string => {
  if (!value) return '';
  const option = group[value];
  return typeof option === 'object' ? option.title : value;
};
