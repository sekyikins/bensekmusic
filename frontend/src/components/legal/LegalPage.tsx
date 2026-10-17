import PageShell from "@/components/ui/PageShell";
import GlassCard from "@/components/ui/GlassCard";

export interface LegalSection {
  heading: string;
  body: React.ReactNode;
}

interface LegalPageProps {
  title: string;
  sections: LegalSection[];
}

export default function LegalPage({ title, sections }: LegalPageProps) {
  return (
    <PageShell width="lg">
      <GlassCard>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white">{title}</h1>

        <div className="space-y-6 text-sm sm:text-base leading-relaxed">
          <p>Last updated: {new Date().toLocaleDateString()}</p>

          {sections.map((section) => (
            <section key={section.heading}>
              <h2 className="text-xl font-bold text-white mt-8 mb-4">{section.heading}</h2>
              {section.body}
            </section>
          ))}
        </div>
      </GlassCard>
    </PageShell>
  );
}
