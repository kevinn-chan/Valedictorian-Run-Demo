import type { Metadata } from "next";
import { Newsreader, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";

// Headings carry the "calm library" half of the brief; the UI carries the
// rest. Serif against grotesque is a real contrast axis, which the previous
// single-sans setup had none of.
const headingSerif = Newsreader({
  variable: "--font-heading-serif",
  subsets: ["latin"],
  display: "swap",
});

const uiSans = IBM_Plex_Sans({
  variable: "--font-ui-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Valedictorian Run",
  description:
    "Your course materials, compiled into a study system: summaries, plans, cue cards, and cited answers.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${uiSans.variable} ${headingSerif.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme:dark)').matches))document.documentElement.classList.add('dark')}catch(e){}})()`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
