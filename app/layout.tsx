'use client'
import { ThemeProvider } from '@/components/theme-provide'
import '@/styles/globals.css';
import { useTheme } from "next-themes"
import { useEffect } from 'react';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const { setTheme } = useTheme()
    useEffect(() => {
        setTheme('dark');
    }, [])
    return (
        <html lang="zh" suppressHydrationWarning>
            <body>
                <ThemeProvider
                    attribute="class"
                    defaultTheme="system"
                    enableSystem
                    disableTransitionOnChange
                >
                    {/* Layout UI */}
                    {/* Place children where you want to render a page or nested layout */}
                    <main>{children}</main>
                    <div className='flex flex-col gap-2 py-4 items-center justify-center text-gray-400'>
                        Powered by Ar-Sr-Na
                    </div>
                </ThemeProvider>
            </body>
        </html>
    )
}