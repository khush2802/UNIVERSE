import { Section } from '@/components/layout/Section';
import { Hero } from '@/components/hero/Hero';
import { UniverseCanvas } from '@/components/universe/UniverseCanvas';
import { ProjectGrid } from '@/components/projects/ProjectGrid';
import { SkillsConstellation } from '@/components/skills/SkillsConstellation';
import { buildSkills } from '@/lib/skills';
import { Achievements, Journey } from '@/components/journey/Journey';
import { Contact } from '@/components/contact/Contact';
import { about } from '@/data/journey';
import { profile } from '@/data/profile';
import { getDataSource } from '@/lib/dataSource';

export default async function HomePage() {
  const projects = await getDataSource().listProjects();
  const skillGroups = buildSkills(projects);

  return (
    <>
      {/* Hero — chunk 03. The h1 lives here, so this section has no
          Section title of its own. */}
      <Section id="home" bleed>
        <Hero />
      </Section>

      {/* Universe — chunks 04 and 05. Full-bleed: the 3D canvas needs the
          whole viewport width. */}
      <Section
        id="universe"
        title="Explore my universe"
        intro="Every domain is a planet. Every project orbits the domain it belongs to."
        bleed
      >
        <div className="pb-24">
          <UniverseCanvas projects={projects} />
        </div>
      </Section>

      {/* Projects — chunk 06 */}
      <Section
        id="projects"
        title="Projects"
        intro="Generated from their repositories, not written by hand."
      >
        <ProjectGrid projects={projects} />
      </Section>

      {/* Skills — chunk 10 */}
      <Section
        id="skills"
        title="Skills"
        intro="Brighter entries are the ones analysed repositories provide evidence for. Select any to see where."
      >
        <SkillsConstellation groups={skillGroups} />
      </Section>

      {/* About — §58. Deliberately short: it sits between the projects
          and the timeline, where a long block would stall the page. */}
      <Section id="about" title="About">
        <div className="measure space-y-4 text-[var(--color-ink-muted)]">
          {about.paragraphs.map((paragraph) => (
            <p key={paragraph.slice(0, 24)}>{paragraph}</p>
          ))}
        </div>
      </Section>

      {/* Journey — chunk 11 */}
      <Section id="journey" title="Journey">
        <Journey />
      </Section>

      {/* Achievements — chunk 11 */}
      <Section
        id="achievements"
        title="Beyond code"
        intro={about.direction}
      >
        <Achievements />
      </Section>

      {/* Contact — chunk 11 */}
      <Section id="contact" title="Let's build something">
        <p className="measure text-[var(--color-ink-muted)]">{profile.tagline}</p>
        <div className="mt-8">
          <Contact />
        </div>
      </Section>

      <footer className="border-t border-[var(--color-line)] px-6 py-10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
          <span className="font-[family-name:var(--font-display)] text-sm tracking-[0.28em]">
            {profile.name.toUpperCase()}
          </span>
          <span className="text-sm text-[var(--color-ink-faint)]">
            © {new Date().getFullYear()} {profile.name}
          </span>
        </div>
      </footer>
    </>
  );
}
