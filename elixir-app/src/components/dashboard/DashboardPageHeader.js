"use client";

export default function DashboardPageHeader({
  title,
  description,
  actions,
  children,
  className = "",
  headingLevel = "h1",
}) {
  const HeadingTag = headingLevel;

  return (
    <header
      className={`flex flex-col gap-3 md:flex-row md:items-end md:justify-between ${className}`.trim()}
    >
      <div className="space-y-1">
        <HeadingTag className="text-2xl font-bold text-[var(--color-primary)]">
          {title}
        </HeadingTag>
        {description && <p className="text-sm text-gray-500">{description}</p>}
        {children}
      </div>

      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </header>
  );
}
