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
                <main className='bg-gray-900 min-h-screen text-white'>{children}</main>
            </body>
        </html>
    )
}