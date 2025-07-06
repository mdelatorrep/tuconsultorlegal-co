interface EmptyPageProps {
  title: string;
  subtitle?: string;
}

export default function EmptyPage({ title, subtitle }: EmptyPageProps) {
  return (
    <div className="container mx-auto px-6 py-20">
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-extrabold text-primary mb-4">
          {title}
        </h1>
        {subtitle && (
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            {subtitle}
          </p>
        )}
        <p className="text-2xl text-muted-foreground">
          (Contenido próximamente)
        </p>
      </div>
    </div>
  );
}