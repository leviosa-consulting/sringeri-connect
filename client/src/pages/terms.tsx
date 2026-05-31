import { Link } from "wouter";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Terms() {
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
          <h1 className="text-2xl font-serif font-bold">Terms &amp; Conditions</h1>
          <p className="opacity-80 text-sm mt-1">Sri Sri Jagadguru Shankaracharya Mahasamsthanam Dakshinamnaya Sri Sharada Peetham, Sringeri</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6 text-sm leading-relaxed text-foreground">

        <p className="text-muted-foreground">
          The terms "We" / "Us" / "Our" / "Trust / Institution" individually and collectively refer to <strong>SRI SRI JAGADGURU SHANKARACHARYA MAHASAMSTHANAM DAKSHINAMNAYA SRI SHARADA PEETHAM SRINGERI</strong> and the terms "Visitor" / "User" refer to the users.
        </p>
        <p className="text-muted-foreground">
          This page states the Terms and Conditions under which you (Visitor) may visit this website ("Website"). Please read this page carefully. If you do not accept the Terms and Conditions stated here, we would request you to exit this site. The Trust / Institution reserves the right to revise these Terms and Conditions at any time. You should visit this page periodically to re-appraise yourself of the Terms and Conditions, because they are binding on all users of this Website.
        </p>

        <section className="space-y-2">
          <h2 className="text-base font-semibold font-serif text-primary">Use of Content</h2>
          <p className="text-muted-foreground">
            All logos, brands, marks, headings, labels, names, signatures, numerals, shapes or any combinations thereof appearing in this site, except as otherwise noted, are properties either owned, or used under licence, by the Trust / Institution or its associate entities. The use of these properties or any other content on this site, except as provided in these terms and conditions, is strictly prohibited.
          </p>
          <p className="text-muted-foreground">
            You may not sell or modify the content of this Website or reproduce, display, publicly perform, distribute, or otherwise use the materials in any way for any public or commercial purpose without the respective organisation's or entity's written permission.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold font-serif text-primary">Acceptable Website Use</h2>
          <h3 className="text-sm font-semibold text-foreground">(A) Security Rules</h3>
          <p className="text-muted-foreground">
            Visitors are prohibited from violating or attempting to violate the security of the Website, including: (1) accessing data not intended for such user or logging into a server or account which the user is not authorised to access; (2) attempting to probe, scan or test the vulnerability of a system or network or to breach security or authentication measures without proper authorisation; (3) attempting to interfere with service to any user, host or network, including via means of submitting a virus or "Trojan horse" to the Website, overloading, "flooding", "mail bombing" or "crashing"; or (4) sending unsolicited electronic mail, including promotions and/or advertising of products or services.
          </p>
          <h3 className="text-sm font-semibold text-foreground">(B) General Rules</h3>
          <p className="text-muted-foreground">
            Visitors may not use the Website in order to transmit, distribute, store or destroy material (a) that could constitute or encourage conduct that would be considered a criminal offence or violate any applicable law or regulation; (b) in a manner that will infringe the copyright, trademark, trade secret or other intellectual property rights of others or violate the privacy or publicity of other personal rights of others; or (c) that is libelous, defamatory, pornographic, profane, obscene, threatening, abusive or hateful.
          </p>
          <p className="text-muted-foreground font-medium">
            Donors making donations are not eligible for Tax exemption under Section 80G.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold font-serif text-primary">Indemnity</h2>
          <p className="text-muted-foreground">
            The User unilaterally agrees to indemnify and hold harmless, without objection, the Trust / Institution and its personnel from and against any claims, actions and/or demands and/or liabilities and/or losses and/or damages whatsoever arising from or resulting from their use of this website or their breach of these terms.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold font-serif text-primary">Liability</h2>
          <p className="text-muted-foreground">
            User agrees that neither the Trust / Institution nor its personnel shall be liable for any direct or indirect or incidental or special or consequential or exemplary damages, resulting from the use or the inability to use the service or messages received or transactions entered into through or from the service or resulting from unauthorized access to or alteration of user's transmissions or data or arising from any other matter relating to the service.
          </p>
          <p className="text-muted-foreground">
            User further agrees that the Trust / Institution shall not be liable for any damages arising from interruption, suspension or termination of service, whether such interruption or suspension or termination was justified or not, negligent or intentional, inadvertent or advertent.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold font-serif text-primary">Refunds and Cancellations</h2>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-900">
            <p className="font-medium">The Trust / Institution has no refund and cancellation policy.</p>
            <p className="mt-1">Once the Seva / Donation is made by the Donor/Devotee, under no circumstances will the Trust / Institution return the donated amount or cancel the transactions completed by the Donor.</p>
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold font-serif text-primary">Fastline Sevas</h2>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Book LIVE seva at fastline.sringeri.net</li>
            <li>Print seva tickets at the KIOSK located at the Private Secretary Office and Guru Nivas</li>
            <li>Only LIVE sevas are available for booking</li>
            <li>Seva bookings for the current date are available from 12:00 am to 12:00 noon and 04:30 pm to 09:00 pm</li>
            <li>Prasadams will not be sent for in absentia bookings</li>
            <li>For in absentia bookings, the seva will be performed on your behalf</li>
          </ul>
        </section>

        <div className="pt-4 border-t border-border/50 text-xs text-muted-foreground/70">
          © {new Date().getFullYear()} Sri Sri Jagadguru Shankaracharya Mahasamsthanam Dakshinamnaya Sri Sharada Peetham, Sringeri. All rights reserved.
        </div>
      </div>
    </div>
  );
}
