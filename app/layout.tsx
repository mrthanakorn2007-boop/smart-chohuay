import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "./components/ThemeProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ร้านแม่ (Chohuay)",
  description: "ระบบขายของหน้าร้าน POS",
  appleWebApp: {
    capable: true,
    title: "ร้านแม่",
    statusBarStyle: "default",
  },
};

// ✅ ส่วนสำคัญ: ตั้งค่า Viewport ให้รองรับมือถือเต็มรูปแบบ
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // ป้องกันการซูมเข้าออกเวลาจิ้มรัวๆ
  viewportFit: "cover", // สำคัญมาก! สั่งให้เนื้อหายืดไปทับพื้นที่ติ่ง/ขีดล่าง (เพื่อให้ safe-area ทำงาน)
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}