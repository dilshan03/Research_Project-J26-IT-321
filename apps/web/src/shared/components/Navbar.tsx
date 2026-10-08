import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Navbar = () => {
  return (
    <nav className="flex items-center justify-between px-8 py-2.5 bg-mq-surface/90 backdrop-blur-md sticky top-0 z-50 shadow-sm border-b border-mq-border">
      <div className="flex flex-col">
        <h1 className="text-3xl font-extrabold tracking-tight flex items-center">
          <span className="text-mq-primary-dark">Math</span>
          <span className="text-mq-secondary">Quest</span>
          <span className="text-mq-accent-yellow ml-1 text-4xl leading-none -mt-3">*</span>
        </h1>
        <span className="text-mq-text-muted text-xs font-semibold tracking-widest uppercase mt-0.5">Small Steps Big Progress</span>
      </div>

      <div className="hidden md:flex space-x-8 font-semibold text-mq-text text-[15px]">
        <a href="#" className="text-mq-primary relative font-bold">
          Home
          <span className="absolute -bottom-1.5 left-0 w-full h-[3px] bg-mq-primary rounded-full"></span>
        </a>
        <a href="#" className="hover:text-mq-primary transition">How It Works</a>
        <a href="#" className="hover:text-mq-primary transition">Features</a>
        <a href="#" className="hover:text-mq-primary transition">For Parents & Teachers</a>
        <a href="#" className="hover:text-mq-primary transition">About</a>
        <a href="#" className="hover:text-mq-primary transition">Contact</a>
      </div>

      <div className="flex space-x-4">
        <Link to="/sign-in" className="btn btn-secondary">
          Sign In
        </Link>
        <button className="btn btn-primary">
          Start Learning <ArrowRight size={18} strokeWidth={3} />
        </button>
      </div>
    </nav>
  );
};
