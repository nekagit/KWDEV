/** layout component. */
export default function ConfigurationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="max-w-4xl w-full mx-auto">
      {children}
    </div>
  );
}
