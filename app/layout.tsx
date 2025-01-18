import type { Metadata } from "next";
import Head from 'next/head';
import dynamic from 'next/dynamic';
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Custom UI for Agentforce",
  description: "Create a custom UI for your Agentforce Service Agent deployment by leveraging the Messaging for In-App and Web APIs",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const CrispWithNoSSR = dynamic(
    () => import('../components/Crisp')
  );

  return (
    <html lang="en">
      <Head>
        <script
          type="text/javascript"
          dangerouslySetInnerHTML={{
            __html: `
              window.$crisp=[];
              window.CRISP_WEBSITE_ID="095c3ea3-a473-44d1-9485-5aff3c1477c2";
              (function(){
                d=document;
                s=d.createElement("script");
                s.src="https://client.crisp.chat/l.js";
                s.async=1;
                d.getElementsByTagName("head")[0].appendChild(s);
              })();
            `,
          }}
        />
      </Head>
      <CrispWithNoSSR />
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}