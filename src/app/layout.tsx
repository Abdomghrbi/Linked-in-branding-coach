import './globals.css'

export const metadata = {
  title: 'مستشار العلامة الشخصية',
  description: 'خبير LinkedIn بخبرة 15 عاماً',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body className="antialiased">{children}</body>
    </html>
  );
}
