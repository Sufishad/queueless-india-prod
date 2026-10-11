import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'QueueLess India - Super Admin Portal',
  description: 'Super Admin moderation, subscription overrides and grievance redressal',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, background: '#090d16' }}>{children}</body>
    </html>
  );
}
