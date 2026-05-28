import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white">
      <h1 className="text-4xl font-bold tracking-tight mb-3">CTSO Center</h1>
      <p className="text-gray-400 text-lg mb-8">AI-powered DECA roleplay practice</p>
      <Link
        href="/practice"
        className="px-6 py-3 bg-white text-black text-sm font-medium rounded hover:bg-gray-200 transition-colors"
      >
        Start Practicing
      </Link>
    </div>
  );
}
