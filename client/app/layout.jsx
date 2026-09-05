import './globals.css';
import { AuthProvider } from '../context/AuthContext';
import { WorkspaceProvider } from '../context/WorkspaceContext';

export const metadata = {
  title: 'DealFlow360 — Intelligent Sales Operations Platform',
  description: 'Self-governing B2B quote-to-cash workflow, pricing governance, and customer portal',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased bg-[#09090b] text-zinc-100 selection:bg-zinc-800 selection:text-white font-sans">
        <AuthProvider>
          <WorkspaceProvider>
            {children}
          </WorkspaceProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

