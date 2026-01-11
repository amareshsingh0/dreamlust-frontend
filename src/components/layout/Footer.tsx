import { Link } from 'react-router-dom';
import { Heart, Twitter, Instagram, Youtube, Mail, Flame } from 'lucide-react';

const footerLinks = {
  explore: [
    { label: 'Trending', href: '/trending' },
    { label: 'New Releases', href: '/explore?sort=newest' },
    { label: 'Categories', href: '/explore' },
    { label: 'Creators', href: '/creators' },
  ],
  support: [
    { label: 'Help Center', href: '/help' },
    { label: 'Contact Us', href: '/contact' },
    { label: 'Feedback', href: '/feedback' },
    { label: 'FAQ', href: '/faq' },
    { label: 'Community', href: '/community' },
  ],
  legal: [
    { label: 'Terms of Service', href: '/terms' },
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Cookie Policy', href: '/cookies' },
    { label: 'DMCA', href: '/dmca' },
  ],
  creators: [
    { label: 'Become a Creator', href: '/creator-signup' },
    { label: 'Creator Guidelines', href: '/guidelines' },
    { label: 'Monetization', href: '/monetization' },
    { label: 'Analytics', href: '/analytics' },
  ],
};

const socialLinks = [
  { icon: Twitter, href: 'https://twitter.com/passionfantasia', label: 'Twitter' },
  { icon: Instagram, href: 'https://instagram.com/passionfantasia', label: 'Instagram' },
  { icon: Youtube, href: 'https://youtube.com/passionfantasia', label: 'YouTube' },
  { icon: Mail, href: 'mailto:passionfantasia@gmail.com', label: 'Email' },
];

export function Footer() {
  return (
    <footer className="relative mt-auto overflow-hidden">
      {/* Gradient top border */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

      {/* Background with subtle gradient */}
      <div className="bg-gradient-to-b from-card to-background/95">
        <div className="max-w-5xl mx-auto px-6 lg:px-8 py-12">
          {/* Main Footer Content - Single Row Layout */}
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-10">

            {/* Brand Section */}
            <div className="flex flex-col gap-0 lg:max-w-xs">
              <Link to="/" className="inline-flex items-center gap-4 group">
                {/* <img
                  src="/icon-192.png"
                  alt="PassionFantasia"
                  className="w-10 h-10 rounded-lg object-contain transition-transform group-hover:scale-105"
                /> */}
                <span className="font-display text-xl font-bold gradient-text">
                  PassionFantasia
                </span>
              </Link>

              <p className="text-muted-foreground text-sm leading-relaxed">
                Premium content<br /> platform for creators<br /> and viewers.
              </p>

              {/* Social Links */}
              <div className="flex gap-2">
                {socialLinks.map((social) => (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-secondary/50 hover:bg-primary hover:text-primary-foreground transition-colors duration-200"
                    aria-label={social.label}
                  >
                    <social.icon className="h-4 w-4" />
                  </a>
                ))}
              </div>
            </div>

            {/* Links Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 lg:gap-16">
              {/* Explore */}
              <div className="space-y-3">
                <h3 className="font-display font-semibold text-sm uppercase tracking-wider text-foreground/90">
                  Explore
                </h3>
                <ul className="space-y-2">
                  {footerLinks.explore.map((link) => (
                    <li key={link.href}>
                      <Link
                        to={link.href}
                        className="text-sm text-muted-foreground hover:text-primary transition-colors duration-200"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Support */}
              <div className="space-y-3">
                <h3 className="font-display font-semibold text-sm uppercase tracking-wider text-foreground/90">
                  Support
                </h3>
                <ul className="space-y-2">
                  {footerLinks.support.map((link) => (
                    <li key={link.href}>
                      <Link
                        to={link.href}
                        className="text-sm text-muted-foreground hover:text-primary transition-colors duration-200"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Legal */}
              <div className="space-y-3">
                <h3 className="font-display font-semibold text-sm uppercase tracking-wider text-foreground/90">
                  Legal
                </h3>
                <ul className="space-y-2">
                  {footerLinks.legal.map((link) => (
                    <li key={link.href}>
                      <Link
                        to={link.href}
                        className="text-sm text-muted-foreground hover:text-primary transition-colors duration-200"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Creators */}
              <div className="space-y-3">
                <h3 className="font-display font-semibold text-sm uppercase tracking-wider text-foreground/90">
                  Creators
                </h3>
                <ul className="space-y-2">
                  {footerLinks.creators.map((link) => (
                    <li key={link.href}>
                      <Link
                        to={link.href}
                        className="text-sm text-muted-foreground hover:text-primary transition-colors duration-200"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="my-8 h-px w-full bg-border/50" />

          {/* Bottom Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} PassionFantasia. All rights reserved.
            </p>
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              Made with
              <Heart className="h-3.5 w-3.5 text-primary fill-primary" />
              <Flame className="h-3.5 w-3.5 text-primary" />
              for creators
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
