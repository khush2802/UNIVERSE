/**
 * Profile data.
 *
 * Anything not yet verified stays `null` and renders as nothing. Spec §62
 * forbids inventing achievements, employers, metrics or credentials, and a
 * null field is safer than placeholder text that could ship unnoticed.
 */

export interface CompetitiveProfile {
  platform: string;
  handle: string;
  url: string;
}

export interface SocialLinks {
  github: string | null;
  linkedin: string | null;
  email: string | null;
  /** Path or URL to the resume PDF. Put the file in /public. */
  resume: string | null;
}

export interface Profile {
  name: string;
  role: string | null;
  disciplines: string[];
  /** Short line under the disciplines. One sentence. */
  headline: string | null;
  /** Body paragraph. Two lines at most. */
  intro: string | null;
  tagline: string;
  location: string | null;
  social: SocialLinks;
  /**
   * Competitive programming profiles.
   *
   * Links only - no ratings, no solved counts. Those go stale the day
   * after you solve something, and a portfolio claiming a number that was
   * true four months ago is the small dishonesty section 62 exists to
   * prevent. A live link is always current.
   */
  competitive: CompetitiveProfile[];
}

export const profile: Profile = {
  name: 'Khush',

  role: 'Software Developer',

  disciplines: ['AI', 'Full Stack', 'DSA'],

  headline: 'Building intelligent software and scalable systems.',

  intro:
    'I combine AI, full-stack engineering, and algorithmic problem solving to turn complex ideas into reliable, production-ready products.',

  tagline: 'Same dreams. Bigger orbit.',

  // TODO - optional, only if you want it shown.
  location: null,

  social: {
    github: 'https://github.com/khush2802',
    linkedin: 'https://www.linkedin.com/in/khush-meena-65903834b/',
    email: 'khush011235@gmail.com',
    // TODO - add the PDF to /public and point at it, e.g. '/khush-resume.pdf'.
    resume: null,
  },

  competitive: [
    {
      platform: 'LeetCode',
      handle: 'khush2802',
      url: 'https://leetcode.com/u/khush2802/',
    },
    {
      platform: 'CodeChef',
      handle: 'khush2802',
      url: 'https://www.codechef.com/users/khush2802',
    },
    {
      platform: 'Codeforces',
      handle: 'khush28022003',
      url: 'https://codeforces.com/profile/khush28022003',
    },
    {
      platform: 'HackerRank',
      handle: 'khush28022003',
      url: 'https://www.hackerrank.com/profile/khush28022003',
    },
  ],
};

export const siteConfig = {
  title: 'Khush — Software Developer | AI · Full Stack · DSA',
  description:
    'An interactive portfolio that generates itself from GitHub repositories. Explore the systems behind the projects.',
  // TODO - set once deployed, used for canonical URLs and OpenGraph.
  url: 'https://example.com',
  ogImage: '/og.png',
} as const;
