interface ContentSectionProps {
  heading: string;
  headingClassName?: string;
  children: React.ReactNode;
}

export default function ContentSection({
  heading,
  headingClassName = "text-2xl font-bold text-white mt-8 mb-4",
  children,
}: ContentSectionProps) {
  return (
    <section>
      <h2 className={headingClassName}>{heading}</h2>
      {children}
    </section>
  );
}
