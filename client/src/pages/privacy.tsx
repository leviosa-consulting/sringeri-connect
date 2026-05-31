import { Link } from "wouter";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Privacy() {
  return (
    <div className="pb-24 lg:pb-8">
      <div className="bg-primary pt-12 pb-8 px-6 text-primary-foreground relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10" />
        <div className="relative z-10">
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-white/80 hover:text-white hover:bg-white/10 -ml-2 mb-3">
              <ChevronLeft className="h-4 w-4 mr-1" /> Back
            </Button>
          </Link>
          <h1 className="text-2xl font-serif font-bold">Privacy Policy</h1>
          <p className="opacity-80 text-sm mt-1">Sri Sri Jagadguru Shankaracharya Mahasamsthanam Dakshinamnaya Sri Sharada Peetham, Sringeri</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6 text-sm leading-relaxed text-foreground">

        <p className="text-muted-foreground">
          The terms "We" / "Us" / "Our" / "Trust" individually and collectively refer to <strong>SRI SRI JAGADGURU SHANKARACHARYA MAHASAMSTHANAM DAKSHINAMNAYA SRI SHARADA PEETHAM SRINGERI</strong> and the terms "You" / "Your" / "Yourself" refer to the users.
        </p>
        <p className="text-muted-foreground">
          This Privacy Policy is an electronic record in the form of an electronic contract formed under the Information Technology Act, 2000 and the rules made thereunder. This Privacy Policy does not require any physical, electronic or digital signature.
        </p>
        <p className="text-muted-foreground">
          Please read this Privacy Policy carefully. By using the Website, you indicate that you understand, agree, and consent to this Privacy Policy. If you do not agree with the terms of this Privacy Policy, please do not use this Website.
        </p>

        <section className="space-y-2">
          <h2 className="text-base font-semibold font-serif text-primary">User Information</h2>
          <p className="text-muted-foreground">
            To avail certain services on our Websites, users are required to provide certain information for processing the Seva / Donation, namely:
          </p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Your Name</li>
            <li>Address</li>
            <li>Mobile Number</li>
            <li>E-mail address</li>
            <li>PAN</li>
            <li>Seva Details like seva karta, Gotra, etc.</li>
          </ul>
          <p className="text-muted-foreground">
            All required information is service-dependent and we may use the above-said user information to maintain, protect, and improve our services and for developing new services. Such information will not be considered as sensitive if it is freely available and accessible in the public domain.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold font-serif text-primary">Cookies</h2>
          <p className="text-muted-foreground">
            To improve the responsiveness of the sites for our users, we may use "cookies" or similar electronic tools to collect information to assign each visitor a unique, random number as a User Identification (User ID) to understand the user's individual interests using the Identified Computer. Unless you voluntarily identify yourself (through registration, for example), we will have no way of knowing who you are, even if we assign a cookie to your computer. A cookie cannot read data off your hard drive.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold font-serif text-primary">Links to Other Sites</h2>
          <p className="text-muted-foreground">
            Our policy discloses the privacy practices for our own Website only. Our Website provides links to other websites also that are beyond our control. We shall in no way be responsible in any way for your use of such sites. We recommend that you check the Privacy Policy of those sites before using them.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold font-serif text-primary">Information Sharing</h2>
          <p className="text-muted-foreground">
            We do not sell, trade, or otherwise transfer to outside parties your personally identifiable information. This does not include trusted third parties who assist us in operating our website, conducting our business, or servicing you, so long as those parties agree to keep this information confidential.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold font-serif text-primary">Information Security</h2>
          <p className="text-muted-foreground">
            We take appropriate security measures to protect against unauthorized access to or unauthorized alteration, disclosure or destruction of data. These include internal reviews of our data collection, storage and processing practices and security measures, including appropriate encryption and physical security measures to guard against unauthorized access to systems where we store personal data.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold font-serif text-primary">Contacting Us</h2>
          <div className="bg-muted/50 rounded-lg p-4 space-y-1 text-muted-foreground">
            <p className="font-medium text-foreground">The Administrator</p>
            <p>Sringeri Math and its Properties</p>
            <p>Sringeri, Chikkamagaluru District</p>
            <p>Karnataka – 577139</p>
            <p className="pt-2">📞 +91-8265-252525 / 262626 / 272727</p>
            <p>✉️ <a href="mailto:seva@sringeri.net" className="text-primary hover:underline">seva@sringeri.net</a></p>
          </div>
        </section>

        <div className="pt-4 border-t border-border/50 text-xs text-muted-foreground/70">
          © {new Date().getFullYear()} Sri Sri Jagadguru Shankaracharya Mahasamsthanam Dakshinamnaya Sri Sharada Peetham, Sringeri. All rights reserved.
        </div>
      </div>
    </div>
  );
}
