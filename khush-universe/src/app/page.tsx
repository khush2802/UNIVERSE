import { Section, Pending } from '@/components/layout/Section';
import { Hero } from '@/components/hero/Hero';
import { UniverseCanvas } from '@/components/universe/UniverseCanvas';
import { ProjectGrid } from '@/components/projects/ProjectGrid';
import { profile } from '@/data/profile';
import { getDataSource } from '@/lib/dataSource';

export default async function HomePage() {
  const projects = await getDataSource().listProjects();

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
        intro="Derived from what the projects actually use."
      >
        <Pending
          chunk="Chunk 10"
          note="Constellation grouped by category. Each skill links to the projects providing evidence for it."
        />
      </Section>

      {/* Journey — chunk 11 */}
      <Section id="journey" title="Journey">
        <Pending
          chunk="Chunk 11"
          note="Timeline from real resume dates. Nothing rendered until that data exists."
        />
      </Section>

      {/* Achievements — chunk 11 */}
      <Section id="achievements" title="Beyond code">
        <Pending
          chunk="Chunk 11"
          note="Grouped by category. Per spec §62 nothing here is invented, so this stays empty until you supply the real entries."
        />
      </Section>

      {/* Contact — chunk 11 */}
      <Section id="contact" title="Let's build something">
        <p className="measure text-[var(--color-ink-muted)]">{profile.tagline}</p>
        <div className="mt-8">
          <Pending
            chunk="Chunk 11"
            note="Email, GitHub, LinkedIn and resume links. All four are null in profile.ts until you provide them."
          />
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
