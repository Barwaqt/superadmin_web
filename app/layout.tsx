import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {title:'Barwaqt | Super Admin',description:'Barwaqt platform administration console.'};
export default function RootLayout({children}:{children:React.ReactNode}) {return <html lang="en"><body>{children}</body></html>}
