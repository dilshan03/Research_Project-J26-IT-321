import { Link } from 'react-router-dom';
import { GraduationCap, Languages, Users, ShieldCheck, Mail, UserRound, School, Gamepad2, ArrowRight } from 'lucide-react';
import { useAuth } from '../../auth/hooks/useAuth';
import { dashboardPathFor } from '../../auth/roleRoutes';
import { publicText } from '../../../shared/i18n/publicText';

/**
 * Public contact email. Left empty until the research team publishes one; the Contact section
 * then shows only the project details (no placeholder address is ever displayed).
 */
const CONTACT_EMAIL = '';

const ABOUT_ICONS = [
  { icon: <GraduationCap size={22} />, tone: 'bg-mq-surface-blue text-mq-primary' },
  { icon: <Languages size={22} />, tone: 'bg-mq-surface-purple text-mq-accent-purple' },
  { icon: <Users size={22} />, tone: 'bg-mq-surface-green text-mq-success' },
  { icon: <ShieldCheck size={22} />, tone: 'bg-mq-surface-pink text-mq-danger' },
];

export const AboutSection = () => {
  const t = publicText.about;
  return (
    <section id="about" className="relative py-16 sm:py-20 bg-white scroll-mt-16">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <p className="text-mq-text-soft uppercase tracking-widest text-xs sm:text-sm font-bold">{t.kicker}</p>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-mq-text-strong">{t.title}</h2>
          <p className="text-base sm:text-lg text-mq-text-muted leading-relaxed">{t.text}</p>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {t.points.map((p, i) => (
            <li key={i} className="bg-white rounded-3xl border border-mq-border shadow-xs p-5 space-y-3 hover:-translate-y-1 transition-transform duration-300">
              <span className={`inline-flex w-12 h-12 rounded-full items-center justify-center ${ABOUT_ICONS[i].tone}`}>{ABOUT_ICONS[i].icon}</span>
              <h3 className="text-base font-bold text-mq-text-strong">{p.title}</h3>
              <p className="text-sm text-mq-text-muted leading-relaxed">{p.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

export const ContactSection = () => {
  const { user, isAuthenticated } = useAuth();
  const t = publicText.contact;
  return (
    <section id="contact" className="relative py-16 sm:py-20 bg-gradient-to-b from-white to-mq-surface-soft scroll-mt-16">
      <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 grid gap-6 lg:grid-cols-2 items-stretch">
        <div className="bg-white rounded-3xl border border-mq-border shadow-xs p-6 sm:p-8 space-y-4">
          <p className="text-mq-text-soft uppercase tracking-widest text-xs sm:text-sm font-bold">{t.kicker}</p>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-mq-text-strong">{t.title}</h2>
          <p className="text-base text-mq-text-muted leading-relaxed">{t.text}</p>
          {CONTACT_EMAIL && (
            <a href={`mailto:${CONTACT_EMAIL}`} className="inline-flex items-center gap-2 text-base font-semibold text-mq-primary hover:underline">
              <Mail size={18} /> {CONTACT_EMAIL}
            </a>
          )}
        </div>

        <div className="bg-white rounded-3xl border border-mq-border shadow-xs p-6 sm:p-8 space-y-4">
          <h3 className="text-xl font-extrabold text-mq-text-strong">{t.whoTitle}</h3>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <span className="inline-flex w-10 h-10 shrink-0 rounded-full items-center justify-center bg-mq-surface-blue text-mq-primary"><UserRound size={20} /></span>
              <p className="text-sm text-mq-text"><strong className="text-mq-text-strong">{t.parentsLabel}</strong> {t.parentsText}</p>
            </li>
            <li className="flex items-start gap-3">
              <span className="inline-flex w-10 h-10 shrink-0 rounded-full items-center justify-center bg-mq-surface-green text-mq-success"><School size={20} /></span>
              <p className="text-sm text-mq-text"><strong className="text-mq-text-strong">{t.teachersLabel}</strong> {t.teachersText}</p>
            </li>
            <li className="flex items-start gap-3">
              <span className="inline-flex w-10 h-10 shrink-0 rounded-full items-center justify-center bg-mq-surface-pink text-mq-danger"><Gamepad2 size={20} /></span>
              {/* The label attaches directly to the text (Sinhala suffix / English leading space are in the text) */}
              <p className="text-sm text-mq-text"><strong className="text-mq-text-strong">{t.studentsLabel}</strong>{t.studentsText}</p>
            </li>
          </ul>
          <div className="flex flex-wrap gap-3 pt-1">
            {isAuthenticated && user ? (
              <Link to={dashboardPathFor(user.role)} className="btn btn-primary px-5 py-2.5 rounded-full text-sm inline-flex items-center gap-2">
                {t.goToDashboard} <ArrowRight size={16} strokeWidth={2.5} />
              </Link>
            ) : (
              <>
                <Link to="/sign-up" className="btn btn-primary px-5 py-2.5 rounded-full text-sm inline-flex items-center gap-2">
                  {t.createAccount} <ArrowRight size={16} strokeWidth={2.5} />
                </Link>
                <Link to="/sign-in" className="btn btn-secondary px-5 py-2.5 rounded-full text-sm">{t.signIn}</Link>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
