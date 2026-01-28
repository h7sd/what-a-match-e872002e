import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FadeIn } from './FadeIn';
import { useAuth } from '@/lib/auth';

interface FooterLink {
  label: string;
  to?: string;
  external?: boolean;
  scrollTo?: string;
  isLogout?: boolean;
}

interface FooterColumn {
  title: string;
  links: FooterLink[];
}

const footerColumns: FooterColumn[] = [
  {
    title: 'General',
    links: [
      { label: 'Login', to: '/auth' },
      { label: 'Sign Up', to: '/auth' },
      { label: 'Dashboard', to: '/dashboard' },
      { label: 'Logout', isLogout: true },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'FAQ', to: '/', scrollTo: 'faq' },
      { label: 'Features', to: '/', scrollTo: 'features' },
    ],
  },
  {
    title: 'Contact',
    links: [
      { label: 'Support Email', to: 'mailto:info@ogcomtests.com', external: true },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Terms of Service', to: '/terms' },
      { label: 'Privacy Policy', to: '/privacy' },
      { label: 'Imprint', to: '/imprint' },
    ],
  },
];

function FooterLinkItem({ link, onLogout }: { link: FooterLink; onLogout?: () => void }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleClick = (e: React.MouseEvent) => {
    if (link.scrollTo) {
      e.preventDefault();
      
      if (location.pathname !== '/') {
        navigate('/');
        setTimeout(() => {
          const element = document.getElementById(link.scrollTo!);
          element?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      } else {
        const element = document.getElementById(link.scrollTo);
        element?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  if (link.isLogout) {
    return (
      <button
        onClick={onLogout}
        className="text-sm text-muted-foreground hover:text-primary transition-colors text-left"
      >
        {link.label}
      </button>
    );
  }

  if (link.external) {
    return (
      <a
        href={link.to}
        className="text-sm text-muted-foreground hover:text-primary transition-colors"
        target="_blank"
        rel="noopener noreferrer"
      >
        {link.label}
      </a>
    );
  }

  if (link.scrollTo) {
    return (
      <button
        onClick={handleClick}
        className="text-sm text-muted-foreground hover:text-primary transition-colors text-left"
      >
        {link.label}
      </button>
    );
  }

  return (
    <Link
      to={link.to || '/'}
      className="text-sm text-muted-foreground hover:text-primary transition-colors"
    >
      {link.label}
    </Link>
  );
}

export function Footer() {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  // Filter out logout link if user is not logged in
  const filteredColumns = footerColumns.map(column => {
    if (column.title === 'General') {
      return {
        ...column,
        links: column.links.filter(link => !link.isLogout || user)
      };
    }
    return column;
  });

  return (
    <footer className="border-t border-border/50 mt-16">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <FadeIn>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            {filteredColumns.map((column) => (
              <div key={column.title}>
                <h3 className="text-sm font-semibold text-foreground mb-4">
                  {column.title}
                </h3>
                <ul className="space-y-3">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      <FooterLinkItem link={link} onLogout={handleLogout} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-border/50 gap-4">
            <Link to="/" className="text-xl font-bold text-primary">
              UserVault
            </Link>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} UserVault. All rights reserved.
            </p>
          </div>
        </FadeIn>
      </div>
    </footer>
  );
}
