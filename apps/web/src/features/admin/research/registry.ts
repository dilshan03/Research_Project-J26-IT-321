/**
 * Research components shown in the admin analytics section. The server's component list is authoritative for
 * snapshot data; this registry only decides navigation labels and which page renders a component.
 * Component owners can switch `page` to a dedicated page once their outputs are registered.
 */
export interface ResearchComponentEntry {
  id: string;
  title: string;
  shortTitle: string;
  page: 'learner-profile' | 'generic';
}

export const RESEARCH_COMPONENTS: ResearchComponentEntry[] = [
  { id: 'learner-profile', title: 'Learner Profile & Prediction Engine', shortTitle: 'Learner Profile', page: 'learner-profile' },
  { id: 'behaviour-signal', title: 'Behaviour Signal Analysis', shortTitle: 'Behaviour Signal', page: 'generic' },
  { id: 'content-adaptation', title: 'Content Adaptation', shortTitle: 'Content Adaptation', page: 'generic' },
  { id: 'pedagogical-engine', title: 'Pedagogical Engine', shortTitle: 'Pedagogical Engine', page: 'generic' },
];

export const findResearchComponent = (id: string | undefined): ResearchComponentEntry | undefined =>
  RESEARCH_COMPONENTS.find((c) => c.id === id);
