# Dental Airway Institute — index.html Component Reference

A plain-English inventory of every distinct UI component on the landing page (`index.html`), listed in page order. Repeated components (buttons, cards, image-slots) are consolidated into a single entry noting where they recur.

**1. Sticky Navigation Bar** (`nav.nav`)
Fixed to the top of the page, stays visible while scrolling (frosted-glass blur background). Contains the logo, five anchor links that jump to page sections (Course, Agenda, Faculty, Venue, Pricing), and a "Reserve a seat" button.

**2. Brand Mark / Logo**
A small breathing-lines SVG icon plus the "Dental Airway Institute" wordmark. Appears in the nav; a matching wave motif recurs decoratively elsewhere on the page.

**3. Hero Section**
The top banner: an eyebrow tag ("Limited to X Seats"), the big "Dental Airway Institute" headline, an intro paragraph, the date/location line, and two buttons ("Explore the curriculum," "Registration & tuition").

**4. Stats Band**
A full-width highlighted strip just below the hero showing four key numbers side by side (days of instruction, CE credit hours, seats remaining, faculty count) — each a big figure over a small caption.

**5. "Who Should Attend" Section**
An eyebrow label, heading, intro paragraph, and a 4-up grid of audience cards (general dentists, pediatric dentists, restorative/prosthodontic dentists, airway-focused dentists).

**6. Card Component** (`.card`)
A boxed content tile with a title and body text. Used for the audience grid; a heavier "elevated" variant (`.card.elev-sm`, with a drop shadow) is used for the agenda.

**7. Course/Curriculum List**
A numbered 4-row list ("01"–"04") laying out the four training modules, each with a number, a title, and a description.

**8. Full-Bleed Photo Band**
A wide decorative image strip with a short caption line beneath it — a breathing pause between the curriculum and agenda sections.

**9. Image-Slot Component** (`<image-slot>`)
A drag-and-drop photo placeholder that's part of the site-builder tooling. Used in four spots: the photo band above, two of the four faculty headshots, and the venue photo. Editors can drop a picture directly onto it and it's saved.

**10. Agenda Section**
Day-by-day schedule for the four-day retreat (Thu–Sun), shown as four agenda cards, each with a date "kicker," a title, a body description, and a time slot (currently a placeholder).

**11. Faculty Section**
Heading plus a 4-up grid of instructor bios. Each entry pairs a circular headshot (either a plain image or an image-slot) with the instructor's name, credential/specialty tag, and a bio paragraph.

**12. Venue Section**
Two-column layout: descriptive text plus a "View the resort location" link on one side, a venue photo (image-slot) on the other.

**13. Buttons**
Three visual styles reused throughout: `btn-primary` (solid-outline, used for main calls to action like "Reserve a seat," "Register now"), `btn-ghost` (lower-emphasis, used for "Registration & tuition"), and `btn-secondary` (used for "View the resort location" and the form's "Send" button).

**14. Tag/Badge** (`.tag.tag-outline`)
Small pill-shaped label used for "Limited to X Seats" in the hero.

**15. Pricing/Tuition Section**
Shows the price in large type, fine print about deposits and practice rates, a "Register now" button, and a checklist of what's included in tuition (custom bulleted list with accent-colored dot markers).

**16. FAQ Accordion**
Five expandable question/answer rows (native `<details>`/`<summary>` elements) covering airway experience requirements, bringing a colleague, CE credit, cancellation policy, and guests.

**17. Register/Contact Section**
Two columns: a closing pitch with a "Reserve a seat" button, and a short contact form.

**18. Contact Form**
Name, Email, and Question fields (each a label+input `.field` pair), a "Send" button, and a message area that displays a thank-you note after submission (currently local-only — doesn't send anywhere yet).

**19. Footer**
Bottom bar with the institute name and three external links (Elements Dental Studio, Miraval Arizona, Register).

**20. Decorative Background Elements**
Non-interactive visual flourishes layered throughout: soft gradient washes, faint wavy-line SVG motifs (echoing the breathing icon), a repeating spiral mark graphic, and blended photo overlays. These carry no content or function — purely atmosphere for the dark "Nocturne" theme.
