// Landing Page - Marketing page for Founder Bleed
// Primary CTA: "TRIAGE YOUR TIME" -> starts OAuth flow

import { auth, signIn } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { LogoWithText } from '@/components/logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { HowItWorksCarousel } from '@/components/how-it-works-carousel';
import { DelegationPyramid } from '@/components/delegation-pyramid';
import { Button } from '@/components/ui/button';
import { Shield, Lock, Trash2, Eye, ChevronRight, BarChart3 } from 'lucide-react';
import Link from 'next/link';

export default async function LandingPage() {
  const session = await auth();
  const isLoggedIn = !!session?.user;

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <LogoWithText />
          <div className="flex items-center gap-4">
            <ThemeToggle />
            {isLoggedIn ? (
              <Link href="/processing">
                <Button variant="outline" size="sm">
                  Dashboard
                </Button>
              </Link>
            ) : (
              <form
                action={async () => {
                  'use server';
                  await signIn('google', { redirectTo: '/processing' });
                }}
              >
                <Button variant="ghost" size="sm" type="submit">
                  Sign In
                </Button>
              </form>
            )}
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="py-16 md:py-24 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
              Stop Bleeding Time on Work That Isn&apos;t Yours
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-10 max-w-3xl mx-auto">
              Discover how much you&apos;re losing by doing work that should be
              delegated. Get a personalized hiring prescription in minutes.
            </p>

            {/* Primary CTA */}
            <form
              action={async () => {
                'use server';
                const session = await auth();
                if (session?.user) {
                  redirect('/processing');
                }
                await signIn('google', { redirectTo: '/processing' });
              }}
            >
              <Button
                type="submit"
                size="lg"
                className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-8 py-6 text-lg font-bold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 min-w-[44px] min-h-[44px]"
              >
                TRIAGE YOUR TIME
                <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
            </form>

            {/* Badge */}
            <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/30 rounded-full">
              <BarChart3 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                AI-Powered Calendar Audit
              </span>
            </div>

            {/* Privacy Note */}
            <p className="mt-6 text-sm text-gray-500 dark:text-gray-400 flex items-center justify-center gap-2">
              <Eye className="h-4 w-4" />
              Read-only calendar access. We never modify your calendar.
            </p>
          </div>
        </section>

        {/* How It Works Carousel */}
        <HowItWorksCarousel />

        {/* Delegation Pyramid */}
        <DelegationPyramid />

        {/* Sample Report Preview */}
        <section className="py-16 px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-4 text-gray-900 dark:text-white">
              Your Time Audit Report
            </h2>
            <p className="text-center text-gray-600 dark:text-gray-400 mb-12 max-w-2xl mx-auto">
              Get a comprehensive breakdown of where your time goes and exactly
              who should be doing what.
            </p>

            {/* Sample Report Card */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              {/* Hero Metric */}
              <div className="bg-gradient-to-r from-red-500 to-red-600 p-6 text-white text-center">
                <div className="text-5xl font-bold">$847K</div>
                <div className="text-red-100 mt-2">
                  Annual Cost of Misallocated Time
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    32.5h
                  </div>
                  <div className="text-sm text-gray-500">Weekly Delegable</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    73%
                  </div>
                  <div className="text-sm text-gray-500">Below Your Level</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    3
                  </div>
                  <div className="text-sm text-gray-500">Recommended Hires</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    42
                  </div>
                  <div className="text-sm text-gray-500">Planning Score</div>
                </div>
              </div>

              {/* Role Recommendations Preview */}
              <div className="p-6">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                  Role Recommendations
                </h3>
                <div className="space-y-3">
                  {[
                    {
                      role: 'Executive Assistant',
                      hours: '15h/week',
                      tier: 'EA',
                    },
                    {
                      role: 'Junior Engineer',
                      hours: '10h/week',
                      tier: 'Junior',
                    },
                    {
                      role: 'Technical Lead',
                      hours: '7.5h/week',
                      tier: 'Senior',
                    },
                  ].map((rec) => (
                    <div
                      key={rec.role}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                    >
                      <div>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {rec.role}
                        </span>
                        <span className="ml-2 text-sm text-gray-500">
                          {rec.hours}
                        </span>
                      </div>
                      <span className="text-xs px-2 py-1 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                        {rec.tier}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Blur overlay for sample data */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-gray-800 via-transparent to-transparent pointer-events-none" />
              </div>
            </div>
          </div>
        </section>

        {/* Privacy Section */}
        <section className="py-16 px-4 bg-gray-50 dark:bg-gray-900/50">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-4 text-gray-900 dark:text-white">
              Your Data, Your Control
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-12 max-w-2xl mx-auto">
              We take your privacy seriously. Here&apos;s how we protect your
              calendar data.
            </p>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Eye className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Read-Only Access
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  We only read your calendar events. We can never create,
                  modify, or delete anything.
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Lock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Encrypted Storage
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  All sensitive data is encrypted with AES-256-GCM. Your event
                  titles are never stored in plain text.
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm">
                <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Delete Anytime
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  You can delete all your data at any time from your settings.
                  No questions asked.
                </p>
              </div>
            </div>

            <div className="mt-8">
              <Link
                href="/privacy"
                className="text-blue-600 dark:text-blue-400 hover:underline text-sm inline-flex items-center gap-1"
              >
                Read our full Privacy Policy
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-20 px-4">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-6">
              Ready to reclaim your time?
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
              Your free audit takes less than 5 minutes to set up.
            </p>

            <form
              action={async () => {
                'use server';
                const session = await auth();
                if (session?.user) {
                  redirect('/processing');
                }
                await signIn('google', { redirectTo: '/processing' });
              }}
            >
              <Button
                type="submit"
                size="lg"
                className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-8 py-6 text-lg font-bold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 min-w-[44px] min-h-[44px]"
              >
                TRIAGE YOUR TIME
                <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
            </form>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-100 dark:bg-gray-800 py-12 px-4 border-t border-gray-200 dark:border-gray-700">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <LogoWithText />

            <nav className="flex flex-wrap justify-center gap-6 text-sm">
              <Link
                href="/privacy"
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                Privacy Policy
              </Link>
              <Link
                href="/terms"
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                Terms of Service
              </Link>
              <Link
                href="mailto:support@founderbleed.com"
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                Contact
              </Link>
            </nav>

            <div className="text-sm text-gray-500 dark:text-gray-400">
              © 2026 Founder Bleed
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700 flex justify-center">
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <Shield className="h-4 w-4" />
              <span>SOC 2 Type II Compliant • GDPR Ready</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
