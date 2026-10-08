import { useState } from 'react';
import { ArrowRight, User as UserIcon, LogOut, Menu, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../features/auth/hooks/useAuth';

export const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <nav className="w-full bg-mq-surface/95 backdrop-blur-md sticky top-0 z-50 shadow-sm border-b border-mq-border">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between gap-3 sm:gap-4 min-w-0">
        {/* Left: Branding */}
        <Link to="/" className="flex flex-col shrink-0 text-left group">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center">
            <span className="text-mq-primary-dark">Math</span>
            <span className="text-mq-secondary">Quest</span>
            <span className="text-mq-accent-yellow ml-1 text-3xl sm:text-4xl leading-none -mt-3">*</span>
          </h1>
          <span className="text-mq-text-muted text-[10px] sm:text-xs font-semibold tracking-widest uppercase mt-0.5 whitespace-nowrap">
            Small Steps Big Progress
          </span>
        </Link>

        {/* Center: Desktop Navigation Links (Visible on lg screens 1024px+) */}
        <div className="hidden lg:flex items-center space-x-3 xl:space-x-6 font-semibold text-mq-text text-xs xl:text-[15px] shrink-0">
          <a href="#" className="text-mq-primary relative font-bold whitespace-nowrap">
            Home
            <span className="absolute -bottom-1.5 left-0 w-full h-[3px] bg-mq-primary rounded-full"></span>
          </a>
          <a href="#" className="hover:text-mq-primary transition whitespace-nowrap">
            How It Works
          </a>
          <a href="#" className="hover:text-mq-primary transition whitespace-nowrap">
            Features
          </a>
          <a href="#" className="hover:text-mq-primary transition whitespace-nowrap">
            For Parents & Teachers
          </a>
          <a href="#" className="hover:text-mq-primary transition whitespace-nowrap">
            About
          </a>
          <a href="#" className="hover:text-mq-primary transition whitespace-nowrap">
            Contact
          </a>
        </div>

        {/* Right: Authentication & Action Buttons (Visible on lg screens 1024px+) */}
        <div className="hidden lg:flex items-center space-x-2.5 shrink-0">
          {isAuthenticated && user ? (
            <div className="flex items-center space-x-2">
              {/* Compact User Profile Badge */}
              <div className="flex items-center gap-1.5 px-2 py-1 bg-mq-surface-blue border border-mq-border rounded-full shadow-sm max-w-[130px] xl:max-w-[160px] shrink-0">
                <div className="w-5 h-5 xl:w-6 xl:h-6 bg-mq-primary text-white rounded-full flex items-center justify-center font-bold text-[10px] xl:text-xs shrink-0">
                  {user.fullName ? user.fullName.charAt(0).toUpperCase() : <UserIcon size={12} />}
                </div>
                <div className="flex flex-col text-left overflow-hidden min-w-0">
                  <span className="text-[11px] xl:text-xs font-bold text-mq-text-strong leading-tight truncate">
                    {user.fullName || user.email.split('@')[0]}
                  </span>
                  <span className="text-[9px] xl:text-[10px] font-semibold text-mq-primary capitalize leading-none">
                    {user.role}
                  </span>
                </div>
              </div>

              {/* Sign Out Button */}
              <button
                onClick={logout}
                className="btn btn-secondary text-xs py-1.5 px-2.5 xl:px-3 rounded-full flex items-center gap-1 text-mq-text-muted hover:text-mq-danger hover:border-mq-danger/40 transition-colors whitespace-nowrap shrink-0"
                title="Sign Out"
              >
                <LogOut size={13} />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            <Link to="/sign-in" className="btn btn-secondary text-xs xl:text-sm py-1.5 px-3 whitespace-nowrap shrink-0">
              Sign In
            </Link>
          )}

          <button className="btn btn-primary text-xs xl:text-sm py-1.5 px-3.5 whitespace-nowrap shrink-0">
            Start Learning <ArrowRight size={15} strokeWidth={3} />
          </button>
        </div>

        {/* Hamburger Menu Button & Mobile/Tablet Action (Visible below lg screens < 1024px) */}
        <div className="flex items-center space-x-2 lg:hidden shrink-0">
          {/* Quick Action Button on Tablet */}
          <button className="hidden sm:inline-flex btn btn-primary text-xs py-1.5 px-3 whitespace-nowrap">
            Start Learning <ArrowRight size={14} />
          </button>

          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-xl text-mq-text-muted hover:text-mq-primary hover:bg-mq-surface-soft transition-colors outline-none border border-mq-border/50"
            aria-label="Toggle Navigation Menu"
          >
            {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile / Tablet Dropdown Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden border-t border-mq-border bg-mq-surface px-6 py-4 space-y-4 animate-fade-in shadow-lg">
          <div className="flex flex-col space-y-2.5 font-semibold text-mq-text text-sm">
            <a href="#" className="text-mq-primary font-bold py-1" onClick={() => setIsMobileMenuOpen(false)}>
              Home
            </a>
            <a href="#" className="hover:text-mq-primary py-1" onClick={() => setIsMobileMenuOpen(false)}>
              How It Works
            </a>
            <a href="#" className="hover:text-mq-primary py-1" onClick={() => setIsMobileMenuOpen(false)}>
              Features
            </a>
            <a href="#" className="hover:text-mq-primary py-1" onClick={() => setIsMobileMenuOpen(false)}>
              For Parents & Teachers
            </a>
            <a href="#" className="hover:text-mq-primary py-1" onClick={() => setIsMobileMenuOpen(false)}>
              About
            </a>
            <a href="#" className="hover:text-mq-primary py-1" onClick={() => setIsMobileMenuOpen(false)}>
              Contact
            </a>
          </div>

          <div className="pt-3 border-t border-mq-border flex flex-col gap-2.5">
            {isAuthenticated && user ? (
              <>
                <div className="flex items-center gap-2.5 px-3 py-2 bg-mq-surface-blue border border-mq-border rounded-2xl">
                  <div className="w-8 h-8 bg-mq-primary text-white rounded-full flex items-center justify-center font-bold text-sm shrink-0">
                    {user.fullName ? user.fullName.charAt(0).toUpperCase() : <UserIcon size={16} />}
                  </div>
                  <div className="flex flex-col text-left overflow-hidden">
                    <span className="text-sm font-bold text-mq-text-strong truncate">
                      {user.fullName || user.email.split('@')[0]}
                    </span>
                    <span className="text-xs font-semibold text-mq-primary capitalize">
                      {user.role}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    logout();
                    setIsMobileMenuOpen(false);
                  }}
                  className="btn btn-secondary w-full justify-center gap-2 text-xs py-2 text-mq-danger hover:bg-mq-danger-bg"
                >
                  <LogOut size={16} /> Sign Out
                </button>
              </>
            ) : (
              <Link
                to="/sign-in"
                onClick={() => setIsMobileMenuOpen(false)}
                className="btn btn-secondary w-full justify-center text-xs py-2"
              >
                Sign In
              </Link>
            )}

            <button className="btn btn-primary w-full justify-center text-xs py-2">
              Start Learning <ArrowRight size={16} strokeWidth={3} />
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};
