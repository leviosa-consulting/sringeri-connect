import { Link } from "wouter";
import { Phone, Mail, MapPin } from "lucide-react";

interface SiteFooterProps {
  variant?: "default" | "login";
}

export default function SiteFooter({ variant = "default" }: SiteFooterProps) {
  const year = new Date().getFullYear();

  if (variant === "login") {
    return (
      <div className="relative z-10 w-full max-w-sm mx-auto mt-4 pb-4 text-center space-y-2">
        <div className="flex justify-center gap-4 text-xs text-white/70">
          <Link href="/terms" className="hover:text-white transition-colors underline underline-offset-2">
            Terms &amp; Conditions
          </Link>
          <span className="text-white/40">·</span>
          <Link href="/privacy" className="hover:text-white transition-colors underline underline-offset-2">
            Privacy Policy
          </Link>
        </div>
        <p className="text-xs text-white/50">
          © {year} Sri Sharada Peetham, Sringeri. All rights reserved.
        </p>
      </div>
    );
  }

  return (
    <div className="border-t border-border/50 bg-[#fcfbf7] px-4 py-5">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Links Row */}
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm">
          <Link href="/terms" className="text-primary/70 hover:text-primary transition-colors font-medium" data-testid="link-footer-terms">
            Terms &amp; Conditions
          </Link>
          <span className="text-border hidden sm:inline">|</span>
          <Link href="/privacy" className="text-primary/70 hover:text-primary transition-colors font-medium" data-testid="link-footer-privacy">
            Privacy Policy
          </Link>
          <span className="text-border hidden sm:inline">|</span>
          <a href="https://www.sringeri.net" target="_blank" rel="noopener noreferrer" className="text-primary/70 hover:text-primary transition-colors font-medium" data-testid="link-footer-website">
            sringeri.net
          </a>
        </div>

        {/* Contact Row */}
        <div className="flex flex-col sm:flex-row flex-wrap justify-center items-start sm:items-center gap-3 sm:gap-6 text-xs text-muted-foreground">
          <div className="flex items-start gap-1.5">
            <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary/50" />
            <span>The Administrator, Sringeri Math &amp; its Properties,<br className="sm:hidden" /> Sringeri, Chikkamagaluru District, Karnataka – 577139</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Phone className="h-3.5 w-3.5 shrink-0 text-primary/50" />
            <span>+91-8265-252525 / 262626 / 272727</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5 shrink-0 text-primary/50" />
            <a href="mailto:seva@sringeri.net" className="hover:text-primary transition-colors">seva@sringeri.net</a>
          </div>
        </div>

        {/* Copyright */}
        <p className="text-center text-xs text-muted-foreground/70">
          © {year} Sri Sri Jagadguru Shankaracharya Mahasamsthanam Dakshinamnaya Sri Sharada Peetham, Sringeri. All rights reserved.
        </p>
      </div>
    </div>
  );
}
