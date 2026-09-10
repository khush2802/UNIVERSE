/**
 * Journey, education and achievements.
 *
 * ⚠️  §56 and §62 forbid inventing achievements, certifications, employers
 *     or metrics. Everything below is something Khush has stated. Where a
 *     category has nothing verified in it, the array is empty and the
 *     section renders nothing rather than filler.
 *
 *     The reference mockup showed medal counts, competition placements and
 *     a team captaincy. Those were mockup content, not facts, and are
 *     deliberately absent.
 *
 * Add entries freely — this file is yours. Each one should be something
 * that actually happened.
 */

export type JourneyKind = 'education' | 'work' | 'milestone';

export interface JourneyEntry {
  /** Year or range, shown as given. */
  period: string;
  title: string;
  /** Institution, employer, or context. */
  subtitle?: string;
  detail?: string;
  kind: JourneyKind;
  /** Ongoing entries render with an open-ended marker. */
  current?: boolean;
}

export const journey: JourneyEntry[] = [
  {
    period: '2022 – 2026',
    title: 'B.Tech, Computer Science and Engineering',
    subtitle: 'Indian Institute of Information Technology, Pune',
    kind: 'education',
  },
  {
    period: '2026',
    title: 'Graduated',
    detail:
      'Building full-stack and AI projects, and working through DSA in C++ and Go.',
    kind: 'milestone',
    current: true,
  },
];

export type AchievementCategory =
  | 'technical'
  | 'sports'
  | 'leadership'
  | 'academic'
  | 'certification';

export interface Achievement {
  title: string;
  detail?: string;
  /** Year or range. Omit rather than guess. */
  period?: string;
  category: AchievementCategory;
}

/**
 * Verified achievements only.
 *
 * Currently sparse, and that is the correct state rather than a gap to
 * paper over. Powerlifting is here because Khush has stated he trains and
 * competes; no placements or medals appear because none have been stated,
 * and inventing them is precisely what §56 rules out.
 */
export const achievements: Achievement[] = [
  {
    title: 'Powerlifting',
    detail: 'Trains and competes.',
    category: 'sports',
  },
];

export const ACHIEVEMENT_LABELS: Record<AchievementCategory, string> = {
  technical: 'Technical',
  sports: 'Sport',
  leadership: 'Leadership',
  academic: 'Academic',
  certification: 'Certifications',
};

/**
 * About copy.
 *
 * §58 asks for what Khush builds, his technical interests and learning
 * direction — and explicitly not fabricated personality claims. These are
 * drawn from things he has said about his own work.
 */
export const about = {
  paragraphs: [
    'I build full-stack applications and AI systems — mostly React and Node on the front of things, with Python and Go where the work suits them.',
    'Most of what I make sits where those two meet: interfaces over models, retrieval systems, and the plumbing that makes them reliable enough to hand to someone else.',
    'Alongside that I work through data structures and algorithms in C++, and I am learning Go.',
  ],
  /** Where the work is heading. Stated, not inferred. */
  direction:
    'Working toward full-stack and backend engineering with a specialisation in AI/ML and cloud.',
};
