export const metadata = {
  title: 'مستشار العلامة الشخصية',
  description: 'خبير LinkedIn بخبرة 15 عاماً',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body className="antialiased bg-gray-50">{children}</body>
    </html>
  );
}
