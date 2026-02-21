import type { ReactNode } from "react";

export const metadata = {
  title: "Mixa AI",
  description: "Developer Browser + Knowledge Engine + Infrastructure Control Plane",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
