import '@/styles/globals.css'

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="zh">
            <body>
                {/* Layout UI */}
                {/* Place children where you want to render a page or nested layout */}
                <main>{children}</main>
                <div className='flex flex-col gap-2 py-4 items-center justify-center text-gray-400'>
                    Powered by Ar-Sr-Na
                </div>
            </body>
        </html>
    )
}