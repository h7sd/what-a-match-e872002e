import { Link } from 'react-router-dom';
import { FadeIn } from './FadeIn';

interface FooterLink {
  label: string;
  to: string;
  external?: boolean;
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
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'FAQ', to: '/#faq' },
      { label: 'Features', to: '/#features' },
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

export function Footer() {
  return (
    <footer className="border-t border-border/50 mt-16">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <FadeIn>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            {footerColumns.map((column) => (
              <div key={column.title}>
                <h3 className="text-sm font-semibold text-foreground mb-4">
                  {column.title}
                </h3>
                <ul className="space-y-3">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      {link.external ? (
                        <a
                          href={link.to}
                          className="text-sm text-muted-foreground hover:text-primary transition-colors"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {link.label}
                        </a>
                      ) : (
                        <Link
                          to={link.to}
                          className="text-sm text-muted-foreground hover:text-primary transition-colors"
                        >
                          {link.label}
                        </Link>
                      )}
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
