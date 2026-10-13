import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Sparkles } from 'lucide-react';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children, title, subtitle }) => {
  return (
    <div className="min-h-screen bg-mq-bg flex flex-col justify-between py-8 px-4 sm:px-6 lg:px-8 selection:bg-mq-surface-blue font-sans">
      {/* Top Header & Navigation */}
      <header className="max-w-4xl mx-auto w-full flex items-center justify-between">
        <Link to="/" className="flex flex-col group transition-transform hover:scale-[1.01]">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center">
            <span className="text-mq-primary-dark">Math</span>
            <span className="text-mq-secondary">Quest</span>
            <span className="text-mq-accent-yellow ml-1 text-3xl sm:text-4xl leading-none -mt-3">*</span>
          </h1>
          <span className="text-mq-text-muted text-[10px] sm:text-xs font-semibold tracking-widest uppercase mt-0.5">
            Small Steps Big Progress
          </span>
        </Link>

        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-mq-primary hover:text-mq-primary-hover bg-mq-surface hover:bg-mq-surface-soft px-4 py-2 rounded-full border border-mq-border shadow-sm transition-all hover:-translate-x-0.5"
        >
          <ArrowLeft size={16} />
          <span>Back to Home</span>
        </Link>
      </header>

      {/* Main Form Container */}
      <main className="max-w-md w-full mx-auto my-auto py-6">
        <div className="bg-mq-surface rounded-3xl p-6 sm:p-8 border border-mq-border shadow-md relative overflow-hidden animate-fade-in">
          {/* Subtle Background Accent Blob */}
          <div className="absolute -top-16 -right-16 w-32 h-32 bg-mq-surface-blue rounded-full blur-2xl pointer-events-none opacity-60"></div>
          <div className="absolute -bottom-16 -left-16 w-32 h-32 bg-mq-surface-green rounded-full blur-2xl pointer-events-none opacity-60"></div>

          {/* Card Header */}
          <div className="text-center mb-6 relative z-10">
            <div className="inline-flex items-center justify-center p-2.5 bg-mq-surface-blue text-mq-primary rounded-2xl mb-3 shadow-sm border border-mq-border/50">
              <Sparkles size={24} className="animate-pulse" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-mq-text-strong tracking-tight">
              {title}
            </h2>
            <p className="text-sm text-mq-text-muted mt-1.5 font-medium">
              {subtitle}
            </p>
          </div>

          {/* Form Content */}
          <div className="relative z-10">
            {children}
          </div>
        </div>
      </main>

      {/* Footer Disclaimer */}
      <footer className="max-w-md mx-auto w-full text-center text-xs text-mq-text-muted">
        <p>MathQuest is an educational platform for Sinhala-medium primary mathematics learning.</p>
        <p className="mt-1">© {new Date().getFullYear()} SLIIT Research Project J26-IT-321</p>
      </footer>
    </div>
  );
};
