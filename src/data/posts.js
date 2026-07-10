// Blog content. Each post is written in full and rendered at /blog/<slug>/.
// The cost guide is the featured post; the rest are evergreen repair guides
// that cross-link to the relevant service and suburb pages.

export const POSTS = [
  {
    slug: 'screen-repair-cost-sydney',
    tag: 'Pricing',
    date: '11 June 2026',
    dateISO: '2026-06-11',
    read: '6 min read',
    img: '/images/screen-repair.jpg',
    featured: true,
    title: 'How much does phone screen repair cost in Sydney? (2026 guide)',
    excerpt: 'Quotes for the same cracked screen can range from $99 to $450. Here\'s what actually drives the price — and how to tell a fair quote from a rip-off.',
    lede: 'Three shops, three quotes, $300 apart — for the same cracked screen. Here\'s what actually drives the price, and how to tell a fair quote from a rip-off.',
    // Article body rendered with set:html — uses the .article-body prose styles.
    body: `
      <p>If you've rung around for a screen repair quote, you've probably noticed the spread is enormous. The same cracked iPhone can be quoted anywhere from $99 at a market stall to $450 at an authorised service centre. Neither number is automatically wrong — they're just answering different questions. This guide breaks down where the money goes.</p>

      <h2>The short answer: typical Sydney prices</h2>
      <p>At our <a href="/repairs/screen/riverwood/">Riverwood store</a>, screen replacements with original-quality parts currently start at these prices:</p>

      <div class="price-table-wrap">
        <table class="price-table">
          <thead>
            <tr><th>Brand</th><th>Screen repair</th><th class="pt-time-col">Turnaround</th></tr>
          </thead>
          <tbody>
            <tr><td><span class="pt-brand"><span class="pt-brand-logo"></span>Apple iPhone</span></td><td><span class="pt-price">$99–$549</span></td><td class="pt-time-col"><span class="pt-time">30–60 min</span></td></tr>
            <tr><td><span class="pt-brand"><span class="pt-brand-logo">S</span>Samsung Galaxy</span></td><td><span class="pt-price">$99–$519</span></td><td class="pt-time-col"><span class="pt-time">45–90 min</span></td></tr>
            <tr><td><span class="pt-brand"><span class="pt-brand-logo">G</span>Google Pixel</span></td><td><span class="pt-price">$129–$399</span></td><td class="pt-time-col"><span class="pt-time">30–60 min</span></td></tr>
            <tr><td><span class="pt-brand"><span class="pt-brand-logo">O</span>Oppo / Motorola</span></td><td><span class="pt-price">$99–$349</span></td><td class="pt-time-col"><span class="pt-time">30–60 min</span></td></tr>
          </tbody>
        </table>
      </div>

      <p>"From" matters: within each brand, newer flagships cost more because the panels themselves cost more. An iPhone 15 Pro Max screen is a fundamentally more expensive part than an iPhone 11's.</p>

      <h2>What actually drives the price</h2>

      <h3>1. The panel technology</h3>
      <p>OLED panels (every recent flagship) cost two to four times what an LCD does. Foldables are in their own league again — a Galaxy Z Fold inner screen is one of the most expensive parts in any phone. If your quote seems high for a new flagship, the part price is usually the reason.</p>

      <h3>2. Part quality: OEM vs aftermarket</h3>
      <p>This is the biggest source of the quote spread. A <strong>genuine OEM panel</strong> is identical to what left the factory. A <strong>premium aftermarket</strong> panel meets or exceeds the original spec — we fit both, and always tell you which is which. A <strong>budget aftermarket</strong> panel is where the $99-anywhere quotes come from: dimmer, washed-out colour, and touch response that misses taps. Cheap panels are why a bargain repair often becomes two repairs. <a href="/blog/oem-vs-aftermarket-screens/">We go deeper on OEM vs aftermarket here.</a></p>

      <h3>3. What "screen repair" includes</h3>
      <p>A fair quote includes the part, fitting, full testing (touch, True Tone/brightness sensors, Face ID alignment on iPhones) and a written warranty. Ask these three questions of any shop:</p>
      <ul>
        <li>Is the price for glass only, or the full display assembly?</li>
        <li>What warranty do I get in writing, and for how long?</li>
        <li>If the screen turns out not to be the problem, do I pay anything?</li>
      </ul>

      <div class="article-callout">
        <span class="callout-icon">✓</span>
        <span><strong>Our policy:</strong> free diagnostic, price confirmed before any work starts, and a 6–12 month warranty on every screen. If we can't fix it, you don't pay. <a href="/repairs/screen/">See screen repair pricing →</a></span>
      </div>

      <h2>Repair, claim, or replace?</h2>
      <p>A quick framework. <strong>Repair</strong> if the phone is under ~3 years old and the quote is under a quarter of the replacement cost — which covers almost every screen we see. <strong>Claim on insurance</strong> only if your excess is meaningfully below the repair price (it often isn't). <strong>Replace the phone</strong> when the screen is one of several failing parts — at that point, put the money toward the upgrade instead. We walk through the full decision in <a href="/blog/repair-or-upgrade-phone/">repair or upgrade?</a></p>

      <h2>The bottom line</h2>
      <p>Expect to pay <strong>$99–$169 to start</strong> for a quality same-day screen repair in Sydney, more for new flagships and foldables. Be suspicious of quotes far below that — the saving usually comes out of the panel — and of any shop that won't put a warranty in writing.</p>
      <p>Got a cracked screen right now? <a href="/repairs/screen/riverwood/">Drop into Riverwood Plaza</a> or call <a href="tel:+61295333300">(02) 9533 3300</a> — most screens are done in under an hour.</p>
    `,
  },
  {
    slug: 'cracked-back-glass-repair',
    tag: 'Guides',
    date: '10 July 2026',
    dateISO: '2026-07-10',
    read: '7 min read',
    img: '/images/glass-repair.jpg',
    imgAlt: 'Technician replacing the cracked back glass on a phone at the repair bench',
    title: 'Cracked the back of your phone? The complete guide to back glass repair',
    excerpt: 'A cracked back doesn\'t mean a new phone. What back glass repair involves, what it costs (from $99), why the DIY hairdryer trick goes wrong — and how to keep it from happening again.',
    lede: 'The phone slips off the couch arm, lands face up, and you breathe a sigh of relief because the screen is fine. Then you flip it over.',
    faqs: [
      { q: 'Will fixing the back glass wipe my data?', a: 'No. Back glass repair is a physical, external job. Your photos, apps, and messages are untouched. It\'s always smart to keep a backup in general, but this repair doesn\'t put your data at risk.' },
      { q: 'Is it worth fixing an older phone?', a: 'Often, yes. If the phone still does what you need, a back glass fix from $99 is a fraction of the cost of replacing it, and it keeps a working phone out of a drawer. If you\'re not sure, the free diagnostic will help you weigh it up honestly.' },
      { q: 'My camera looks cracked too. Is that the same repair?', a: 'Sometimes. On several models the rear camera glass is part of the back assembly, so it can be sorted together. On others the camera lens is separate. We\'ll check during the diagnostic and tell you which it is.' },
      { q: 'Can I still use the phone until my appointment?', a: 'Usually, carefully. If glass is actively flaking or the crack is spreading, pop a piece of clear tape over it to hold things together and protect your fingers, and try to bring it in soon before dust gets inside.' },
    ],
    body: `
      <p>You know the moment. The phone slips off the couch arm, lands face up, and you breathe a sigh of relief because the screen is fine. Then you flip it over. The whole back is a spiderweb of cracked glass. It still works, so you tell yourself you'll deal with it later, and "later" turns into weeks of glass catching on your pocket and the odd tiny splinter in your finger.</p>

      <p>Here's the good news we give people every week at the shop: a cracked back doesn't mean a new phone. It's one of the more straightforward repairs we do, and we can usually have it looking like new again while you get on with your day. This guide walks through everything worth knowing — why it happens, why it's worth fixing, what the repair involves, what it costs, and how to keep it from happening again.</p>

      <h2>Why do phone backs crack in the first place?</h2>
      <p>Modern phones are basically two sheets of glass wrapped around a metal frame. Manufacturers moved to glass backs for a couple of reasons: it looks and feels premium, and it lets the phone charge wirelessly, which metal blocks. The trade-off is obvious the first time you drop one. Glass is glass.</p>
      <p>A few things make the back especially prone to cracking. A face-up drop puts all the force on the back panel. Slim cases with no raised lip leave the back exposed. Cold weather can make glass and adhesive a touch more brittle, which is worth remembering through a Sydney winter. And pressure in a tight pocket or bag, or a phone wedged under something heavy, can be enough to start a crack even without a dramatic drop.</p>
      <p>None of that is your fault. Phones are built thin and pretty, not indestructible.</p>

      <h2>Signs it's time to get the back glass sorted</h2>
      <p>Some cracks are obvious. Others creep up. It's worth booking a fix if you notice any of these:</p>
      <ul>
        <li>A visible spiderweb, chip, or hairline crack across the back panel.</li>
        <li>Sharp edges you can feel when you run a finger over it, or tiny glass flakes coming loose.</li>
        <li>A camera area that looks cracked or cloudy — on many phones the rear <a href="/repairs/camera/">camera glass</a> is part of that same back assembly.</li>
        <li>Wireless charging that's suddenly patchy or won't hold a connection.</li>
        <li>Dust and grit starting to gather under the glass, which tells you the seal is broken.</li>
      </ul>
      <p>If you're seeing any of those, the phone is telling you it needs attention.</p>

      <h2>Why bother fixing it at all?</h2>
      <p>Plenty of people live with a shattered back for ages, and we get it — the phone still turns on. But there are real reasons to sort it sooner rather than later.</p>
      <p>Those little glass shards are genuinely sharp, and they love to nick your fingers or snag a jumper. A cracked back also breaks the phone's seal, which lets dust and moisture creep inside toward the delicate electronics — and that's how a cheap cosmetic problem quietly becomes an expensive <a href="/repairs/water-damage/">internal one</a>. If your phone charges wirelessly, a badly cracked back can interfere with that. The camera can suffer too if the crack sits over the lens, giving you blurry or hazy photos. And if you ever plan to sell or trade the phone in, a clean back is worth real money at resale, often far more than the repair costs — we run through that maths in <a href="/blog/repair-or-upgrade-phone/">repair or upgrade?</a></p>
      <p>In short, it's a small problem that quietly turns into bigger ones. Fixing it early keeps it simple and cheap.</p>

      <h2>Please don't try the DIY hairdryer trick</h2>
      <p>We say this with love, because we see the results. There are plenty of videos showing someone lifting a back panel with a hairdryer and a guitar pick in ten minutes. What those videos leave out is everything that goes wrong when you don't do it every day.</p>
      <p>The back panel is bonded on with strong adhesive that needs even, controlled heat to release. Too little and you crack the new glass trying to pry it. Too much and you can cook the battery sitting right underneath, which is a real safety risk. On the way you can slice through the wireless charging coil, the NFC antenna, or the flash cable, all of which live on or just under that back panel. And even if you get the old glass off, reseating a new panel so it sits flush and properly sealed is its own skill. Get it wrong and you're left with a lifting edge, trapped dust, or a fresh crack within a week.</p>
      <p>This is one of those jobs where the tools, the patience, and the practice genuinely matter. It's worth handing to someone who does it all day.</p>

      <h2>What the repair actually involves when we do it</h2>
      <p>Here's roughly what happens when you bring it in. First, the free diagnostic: we look the phone over, check the crack isn't hiding anything more serious, and confirm the exact model so we quote you the right price. Then the old panel comes off — we use a laser machine to break down the adhesive cleanly, which protects the battery and the cables underneath and is what makes same-day turnaround possible. We clean off the old adhesive and any glass fragments, seat the new colour-matched panel, and bond it down so it sits flush and sealed like the day it left the factory. Finally we test everything — wireless charging, cameras, the lot — before we hand it back.</p>
      <p>Done right, you'd never know it happened. That's the whole point.</p>

      <figure class="article-figure">
        <img src="/images/diagnostic.jpg" width="1400" height="934" loading="lazy" decoding="async" alt="A phone on the bench getting a free diagnostic check at Express Repairs in Riverwood" />
        <figcaption>Every back glass job starts with a free diagnostic — we confirm the model and the exact price before any work starts.</figcaption>
      </figure>

      <h2>Which phones can you fix?</h2>
      <p>Most of them. We work on all the major brands, including Apple iPhone, Samsung Galaxy, Google Pixel, Oppo, Huawei, Motorola and more. Newer flagship models with bigger, curved, or dual-toned glass backs can take a little more care and sit slightly higher in price, but they're all fair game. If you're not sure whether your model can be done, just call or drop in and we'll tell you straight away.</p>

      <h2>How much does it cost, and how long does it take?</h2>
      <p><a href="/repairs/back-glass/">Back glass repair</a> starts from $99. We always say "from" because the exact price depends on the model, and bigger or newer phones can sit a little higher. That's the honest answer, and it's exactly why we start with a free diagnostic. We'll look over the phone, tell you precisely what's involved, and give you a firm price before you commit to anything. No obligation, no pressure, and no surprise charges at the counter.</p>
      <p>Most jobs are done in 60–90 minutes — quick enough that you can drop the phone in, duck off to do your shopping or grab a coffee, and come back to a phone that looks like new. If your model needs a part we don't have on the shelf that day, we'll tell you upfront how long it'll take rather than leaving you guessing.</p>

      <div class="article-callout">
        <span class="callout-icon">✓</span>
        <span><strong>Free diagnostic, firm price first.</strong> Bring the phone in, we'll check the crack isn't hiding anything more serious and confirm the exact price before any work starts — no charge, no obligation. <a href="/repairs/back-glass/">See back glass pricing →</a></span>
      </div>

      <h2>Keeping the back safe from here on</h2>
      <p>Once your phone's looking sharp again, a few small habits keep it that way. A case with a raised lip around the back and camera makes a real difference, because it keeps the glass off the ground when the phone lands face up. A slim skin or wrap adds a bit of grip and protection without the bulk if you don't like big cases. Try not to stack the phone under keys, coins, or other hard bits in the same pocket or bag. And in winter, give a very cold phone a minute to warm up before you put any pressure on it.</p>
      <p>None of this is fussy. It's just enough to get your money's worth out of the repair.</p>

      <h2>Frequently asked questions</h2>

      <h3>Will fixing the back glass wipe my data?</h3>
      <p>No. Back glass repair is a physical, external job. Your photos, apps, and messages are untouched. It's always smart to keep a backup in general, but this repair doesn't put your data at risk.</p>

      <h3>Is it worth fixing an older phone?</h3>
      <p>Often, yes. If the phone still does what you need, a back glass fix from $99 is a fraction of the cost of replacing it, and it keeps a working phone out of a drawer. If you're not sure, the free diagnostic will help you weigh it up honestly.</p>

      <h3>My camera looks cracked too. Is that the same repair?</h3>
      <p>Sometimes. On several models the rear camera glass is part of the back assembly, so it can be sorted together. On others the camera lens is separate. We'll check during the diagnostic and tell you which it is — and if it's the lens, <a href="/repairs/camera/">camera repair</a> is its own quick job.</p>

      <h3>Can I still use the phone until my appointment?</h3>
      <p>Usually, carefully. If glass is actively flaking or the crack is spreading, pop a piece of clear tape over it to hold things together and protect your fingers, and try to bring it in soon before dust gets inside.</p>

      <h2>Pop in while you're at Riverwood Plaza</h2>
      <p>You'll find us at Shop 7C, Riverwood Plaza, 257 Belmore Rd, Riverwood, inside the Metro Wireless Store. We're a local fix-it shop, not a big faceless chain, and we look after people from right across the area: Padstow, Peakhurst, Narwee, Beverly Hills, Mortdale, Kingsgrove, Lugarno and Punchbowl.</p>
      <p>If you've been putting off that cracked back, this weekend is a good time to knock it over. Bring the phone in while you're already at the plaza, grab the <a href="/repairs/back-glass/">free diagnostic</a>, and let us take care of the rest.</p>
      <p>Give us a call on <a href="tel:+61295333300">(02) 9533 3300</a> or just drop in. Same-day phone repairs, done right.</p>
    `,
  },
  {
    slug: 'cracked-screen-fix-or-replace',
    tag: 'Screens',
    date: '7 July 2026',
    dateISO: '2026-07-07',
    read: '5 min read',
    img: '/images/broken-vs-fixed.jpg',
    imgAlt: 'A cracked iPhone beside a freshly repaired phone on the repair bench',
    title: 'Cracked screen: should you fix it or replace the phone?',
    excerpt: 'Cracked your screen? Here\'s how to decide whether to repair it or replace the phone, what a repair costs, and how to get it sorted the same day in Riverwood.',
    lede: 'The phone slips out of your hand, hits the tiles, and there it is — a web of cracks. Your first thought is usually "great, now I need a whole new phone." Most of the time, you don\'t.',
    faqs: [
      { q: 'How much does a cracked screen repair cost?', a: 'Screen repairs start from $99 for most popular models. The exact "from" price depends on your phone, which we can confirm with a quick look or a call.' },
      { q: 'Will I lose my photos and data?', a: 'No. A screen repair doesn\'t wipe your phone — your photos, messages and apps stay exactly where they are. It\'s still smart to back up regularly, but a repair on its own doesn\'t touch your data.' },
      { q: 'How long does a screen repair take?', a: 'Most screen repairs are done the same day, and often in under an hour. Drop it off, run your errands, and pick it up sorted.' },
      { q: 'Is it worth fixing an older phone?', a: 'Often yes, especially if the only problem is the screen. If a few things are failing at once, we\'ll give you an honest view on whether repair or replacement is the better value.' },
      { q: 'Do you fix my brand of phone?', a: 'We repair Apple, Samsung, Google, Oppo, Motorola and plenty of others. If you\'re not sure, just ask.' },
    ],
    body: `
      <p>We've all had that stomach-drop moment. The phone slips out of your hand, hits the tiles, and there it is: a web of cracks across the screen. Your first thought is usually "great, now I need a whole new phone." Most of the time, you don't.</p>

      <p>A cracked screen looks worse than it is. In a lot of cases it's a quick fix that costs a fraction of a new phone, and you can be back up and running the same day. Here's how to work out whether to repair or replace, and what to expect either way.</p>

      <h2>First, how bad is it really?</h2>
      <p>Not all cracks are equal. Three things to check before you decide anything:</p>
      <ul>
        <li><strong>Is the screen still responding to touch?</strong> If you can swipe, type and unlock, the damage is likely mostly cosmetic — a straightforward fix.</li>
        <li><strong>Are there lines, black patches or dead spots?</strong> That points to damage under the glass. A bigger job, but still often repairable.</li>
        <li><strong>Is the glass lifting or are there sharp edges?</strong> Stop using it and keep it in a case or a sandwich bag so you don't cut a finger or push shards further in.</li>
      </ul>
      <p>Even if the phone still works, it's worth acting sooner rather than later. A small crack lets in dust and moisture, and touchscreens can slowly get worse over the following weeks. A quick repair now usually saves a bigger one later.</p>

      <h2>When repairing makes sense</h2>
      <p>For most people, repairing is the smart choice — cheaper, faster, and you keep the phone you already know.</p>
      <p>Repair is usually the way to go when your phone is only a couple of years old, the crack is limited to the screen, and everything else (battery, camera, charging) is still doing its job. <a href="/repairs/screen/">Screen repairs</a> start from $99 for most popular models, and the majority are done in under an hour. Drop your phone in at Riverwood Plaza, do a lap of the shops or grab a coffee, and pick it up looking like new.</p>
      <p>A good repair uses quality parts and restores the phone to how it felt before the drop. You keep all your photos, apps and settings — and you're not signing up for a new two-year plan just because of one bad landing. Curious what drives the price? We break it down in <a href="/blog/screen-repair-cost-sydney/">how much screen repair costs in Sydney</a>.</p>

      <h2>When replacing might be the better call</h2>
      <p>Sometimes a new phone is the more sensible option, and we'll tell you straight if that's the case.</p>
      <p>Replacing tends to make more sense when the phone is already quite old and struggling in other ways, when the damage goes well beyond the screen (a bent frame, major water damage, or several failing parts at once), or when the cost of fixing everything creeps close to the value of the phone itself. If the battery is also shot, the charging port is loose, and the back glass is cracked too, those small jobs add up — and at some point a newer phone is the better spend. We walk through that maths in <a href="/blog/repair-or-upgrade-phone/">repair or upgrade?</a></p>
      <p>The honest answer is that it depends on your specific phone, and you shouldn't have to guess. That's exactly what a free diagnostic is for.</p>

      <figure class="article-figure">
        <img src="/images/diagnostic.jpg" width="1400" height="934" loading="lazy" decoding="async" alt="A phone on the bench getting a free diagnostic check at Express Repairs in Riverwood" />
        <figcaption>Every phone gets a free diagnostic first — we confirm the fault and the exact price before any work starts.</figcaption>
      </figure>

      <div class="article-callout">
        <span class="callout-icon">✓</span>
        <span><strong>Not sure which way to go?</strong> Bring the phone in for a free diagnostic — no charge, no obligation. We'll test the screen and touch response, check the rest of the phone, and give you a clear "from" price with an honest recommendation. <a href="/repairs/screen/">See screen repair pricing →</a></span>
      </div>

      <h2>What a screen repair actually involves</h2>
      <p>People often picture a big, risky operation. In practice it's a tidy job for a technician who does it every day: the cracked screen assembly comes off, the inside gets a quick check for any other damage, a fresh screen goes on, and the phone is tested to make sure the display, touch and front camera all behave. For most popular models the whole thing wraps up in under an hour.</p>
      <p>We repair screens across Apple, Samsung, Google, Oppo, Motorola and more, so it doesn't matter which brand landed on the floor.</p>

      <figure class="article-figure">
        <img src="/images/screen-repair.jpg" width="1400" height="2100" loading="lazy" decoding="async" alt="A technician fitting a replacement screen to a cracked phone" />
        <figcaption>Most screen replacements take under an hour — the old assembly comes off, the inside gets checked, and the new display is fitted and tested.</figcaption>
      </figure>

      <h2>Frequently asked questions</h2>

      <h3>How much does a cracked screen repair cost?</h3>
      <p>Screen repairs start from $99 for most popular models. The exact "from" price depends on your phone, which we can confirm with a quick look or a call.</p>

      <h3>Will I lose my photos and data?</h3>
      <p>No. A screen repair doesn't wipe your phone — your photos, messages and apps stay exactly where they are. It's still smart to back up regularly, but a repair on its own doesn't touch your data.</p>

      <h3>How long does it take?</h3>
      <p>Most screen repairs are done the same day, and often in under an hour. Drop it off, run your errands, and pick it up sorted.</p>

      <h3>Is it worth fixing an older phone?</h3>
      <p>Often yes, especially if the only problem is the screen. If a few things are failing at once, we'll give you an honest view on whether repair or replacement is the better value.</p>

      <h3>Do you fix my brand of phone?</h3>
      <p>We repair Apple, Samsung, Google, Oppo, Motorola and plenty of others. If you're not sure, just ask.</p>

      <h2>Cracked screen? Let's take a look</h2>
      <p>A cracked screen doesn't have to mean a new phone. More often than not, it's a quick, affordable fix that gets your phone back to mint the same day.</p>
      <p>Pop in and see us at <a href="/repairs/screen/riverwood/">Riverwood Plaza</a> (Shop 7C, 257 Belmore Rd, Riverwood), or call <a href="tel:+61295333300">(02) 9533 3300</a>. We look after Riverwood and the nearby suburbs — Padstow, Peakhurst, Narwee, Beverly Hills, Mortdale, Kingsgrove, Lugarno and Punchbowl. Screen repairs start from $99, and the free diagnostic is always on the house.</p>
    `,
  },
  {
    slug: 'phone-battery-draining-fast',
    tag: 'Batteries',
    date: '4 June 2026',
    dateISO: '2026-06-04',
    read: '6 min read',
    img: '/images/battery-repair.jpg',
    title: 'Battery draining fast? Try these 7 fixes before replacing it',
    excerpt: 'Half of "dead battery" phones we see just need a settings change. Run through these first.',
    lede: 'Roughly half the "dead battery" phones that come through the shop don\'t need a new battery at all — they need a setting changed. Run through these seven checks before you spend a cent.',
    body: `
      <p>A battery that suddenly drains fast is one of the most common reasons people bring a phone in — and surprisingly often, the cell is fine. A rogue app, a bad update or one aggressive setting can flatten a healthy battery by mid-afternoon. Here's the exact order we check things in, so you can rule out the free fixes before paying for a replacement.</p>

      <h2>First, check the one number that matters</h2>
      <p>On iPhone, open <strong>Settings → Battery → Battery Health &amp; Charging</strong> and look at <strong>Maximum Capacity</strong>. On most Androids it's under <strong>Settings → Battery → Battery health</strong> (or in Samsung's case, Device care). If you're above <strong>80%</strong>, the cell is probably healthy and the drain is something else — keep reading. Below 80%, especially with shutdowns, the battery itself is the likely culprit.</p>

      <h2>The 7 fixes</h2>
      <h3>1. Find the app that's eating the battery</h3>
      <p>In the same Battery screen, scroll to the per-app breakdown. If one app you barely use is near the top, that's your problem. Force-close it, check for an update, or delete and reinstall it.</p>
      <h3>2. Turn off Background App Refresh for apps that don't need it</h3>
      <p>Social, shopping and news apps quietly refresh in the background all day. Restrict the ones that don't need live updates (iPhone: Settings → General → Background App Refresh).</p>
      <h3>3. Tame the screen</h3>
      <p>The display is the single biggest battery drain. Drop brightness, switch on auto-brightness, and shorten auto-lock to 30 seconds. On phones with an always-on display, turning it off alone can add an hour.</p>
      <h3>4. Rein in location services</h3>
      <p>Apps set to "Always" track your location around the clock. Switch them to "While Using" — your maps and rideshare apps will work exactly the same.</p>
      <h3>5. Update the OS — and then wait a day</h3>
      <p>A buggy update can hammer the battery, but so can being out of date. Install pending updates, then give it 24 hours: phones re-index and back up heavily right after an update, which looks like a battery fault but settles down.</p>
      <h3>6. Watch 5G in weak-signal areas</h3>
      <p>If you're somewhere with patchy 5G, the phone burns power hunting for signal. Switching to "5G Auto" or LTE in those spots helps more than people expect.</p>
      <h3>7. Restart it</h3>
      <p>Unglamorous, but a phone that hasn't been restarted in weeks can have a stuck process draining it. A full power-off-and-on clears it.</p>

      <div class="article-callout">
        <span class="callout-icon">✓</span>
        <span><strong>Still draining after all seven?</strong> Then it probably is the battery — and we'll confirm it with a free health check before you commit. <a href="/repairs/battery/">See battery replacement pricing →</a></span>
      </div>

      <h2>When it's genuinely the battery</h2>
      <p>Replace the cell if you see any of these: maximum capacity under 80%, the phone shutting down while it still shows 20–40%, the back or screen lifting (a swollen battery — stop using it and bring it in), or the case getting hot during normal use. These aren't settings problems.</p>
      <p>A fresh original-quality cell takes 30–45 minutes to fit and buys most phones another year or two — far cheaper than a new handset. If you're near us, <a href="/repairs/battery/riverwood/">drop into Riverwood Plaza</a> (or one stop down the line from <a href="/repairs/battery/padstow/">Padstow</a>) and we'll run the health check and confirm the price before touching your phone. Not sure it's worth it? See <a href="/blog/repair-or-upgrade-phone/">repair or upgrade?</a></p>
    `,
  },
  {
    slug: 'phone-water-damage-what-to-do',
    tag: 'Guides',
    date: '28 May 2026',
    dateISO: '2026-05-28',
    read: '5 min read',
    img: '/images/other-repairs.jpg',
    title: 'Dropped your phone in water? The first 10 minutes decide everything',
    excerpt: 'Skip the rice. Here\'s the first-aid sequence that actually saves water-damaged phones.',
    lede: 'What you do in the first ten minutes after a phone hits water matters more than anything a repair shop can do later. Here\'s the sequence that actually works — and the famous one that doesn\'t.',
    body: `
      <p>Modern phones are water-<em>resistant</em>, not water-<em>proof</em>, and that rating drops as the seals age. Whether it's a sink, a pool or a coffee, the enemy isn't the water itself — it's <strong>corrosion</strong>, which starts within hours as moisture, electricity and metal meet on the circuit board. Move fast and most phones survive. Here's the order that matters.</p>

      <h2>Do this immediately</h2>
      <ol>
        <li><strong>Get it out and power it off.</strong> Don't check if it still works — every second it's powered on while wet risks a short. Hold the power button and shut it down.</li>
        <li><strong>Do not charge it.</strong> Putting power through a wet port is the single fastest way to kill a phone that would otherwise have lived. Resist the urge to "see if it charges."</li>
        <li><strong>Dry the outside and remove what you can.</strong> Wipe it down, pop out the SIM tray, and take the case off so trapped water can escape.</li>
        <li><strong>Don't shake it or blast it with heat.</strong> Shaking pushes water deeper; a hairdryer drives moisture further in and can warp seals and the battery. Just let it sit, port-down, on a towel.</li>
      </ol>

      <h2>Why the rice trick doesn't work</h2>
      <p>It's the most repeated phone advice on the internet, and it's close to useless. Uncooked rice can't pull moisture out from <em>inside</em> a sealed phone — it only dries the surface, which air does anyway. Worse, rice dust and starch get into the port and speakers. The myth persists because phones often survive water <em>despite</em> the rice, not because of it. Skip it.</p>

      <div class="article-callout">
        <span class="callout-icon">✓</span>
        <span><strong>The clock is the thing.</strong> Corrosion starts within hours. The sooner a wet phone is opened, cleaned and dried properly, the better the odds — bring it in the same day if you can. <a href="/repairs/water-damage/">See water damage repair →</a></span>
      </div>

      <h2>What a proper water-damage service involves</h2>
      <p>This is the part rice can't do. We open the phone, disconnect the battery to stop any current, and clean the board with isopropyl alcohol (and an ultrasonic bath where needed) to lift corrosion before it spreads. Then we dry it properly, replace any components the water has already taken out, and test everything. We start with a <strong>free diagnostic</strong> so you know what's salvageable before spending anything.</p>

      <h2>The bottom line</h2>
      <p>Power off, don't charge, don't use heat, and get it to a repairer fast. If it's already been a day or two and the phone is acting strangely — dim screen, dead speaker, won't charge — that's corrosion at work, and it's still often fixable. <a href="/repairs/water-damage/">Bring it into Riverwood Plaza</a> or call <a href="tel:+61295333300">(02) 9533 3300</a> and we'll take a look at no charge.</p>
    `,
  },
  {
    slug: 'oem-vs-aftermarket-screens',
    tag: 'Screens',
    date: '21 May 2026',
    dateISO: '2026-05-21',
    read: '6 min read',
    img: '/images/glass-repair.jpg',
    title: "OEM vs aftermarket screens: what's the real difference?",
    excerpt: 'Brightness, touch response, colour — where cheap screens cut corners, and when aftermarket is genuinely fine.',
    lede: 'It\'s the question behind every "why is your quote different from theirs?" — the screen itself. Here\'s what actually changes between a genuine, a premium aftermarket, and a bargain panel, and which one you actually need.',
    body: `
      <p>When two shops quote $120 apart for the "same" repair, the gap is almost always the panel. Screens aren't one product — they're a spectrum of quality, and the cheapest ones cut corners you can see and feel every day. Here's how to tell them apart.</p>

      <h2>The three tiers</h2>
      <h3>Genuine OEM</h3>
      <p>The exact panel the manufacturer uses — same brightness, same colour calibration, same touch layer. It's the most expensive option and the safest for a flagship you plan to keep. On iPhones it also keeps features like True Tone working cleanly.</p>
      <h3>Premium aftermarket</h3>
      <p>Made to meet or exceed the original spec, often on the same OLED production lines. A good premium aftermarket screen is hard to tell from genuine in daily use, at a noticeably lower price. This is the sweet spot for most repairs — and what we fit unless you ask for genuine.</p>
      <h3>Budget aftermarket</h3>
      <p>Where the suspiciously cheap quotes come from. These are usually LCD panels standing in for OLED, and the compromises are real (below).</p>

      <h2>Where cheap panels cut corners</h2>
      <ul>
        <li><strong>Brightness:</strong> budget panels can be a third dimmer, which you'll fight every time you're outdoors.</li>
        <li><strong>Colour:</strong> washed-out or slightly green/blue whites, because the calibration isn't matched to your phone.</li>
        <li><strong>Touch response:</strong> the cheapest digitizers miss fast taps and swipes — the single most annoying tell.</li>
        <li><strong>Coating:</strong> the oleophobic layer that repels fingerprints is thin or absent, so the glass smudges and "drags" under your thumb.</li>
        <li><strong>Durability:</strong> thinner glass and weaker adhesive mean the next drop is more likely to be fatal.</li>
      </ul>

      <h2>When aftermarket is genuinely fine — and when it isn't</h2>
      <p><strong>Premium aftermarket is a smart choice</strong> for an older or mid-range phone, an LCD-era model, or a phone you plan to trade in within a year. You get a great screen without paying flagship-genuine prices. <strong>Lean toward genuine OEM</strong> if you've got a current flagship with a high-refresh OLED, you keep your phones for years, or colour accuracy matters for your work. What you should avoid in every case is a no-name budget panel sold as a bargain — that's the repair people end up paying for twice.</p>

      <div class="article-callout">
        <span class="callout-icon">✓</span>
        <span><strong>We always tell you which is which.</strong> Every screen we fit — genuine or premium aftermarket — is tested and carries a 6–12 month warranty, and we'll quote both where there's a choice. <a href="/repairs/screen/">See screen repair pricing →</a></span>
      </div>

      <h2>The bottom line</h2>
      <p>"Screen repair" can mean three very different parts at three very different prices. Ask any shop which tier they're quoting and what the warranty is — a fair repairer will tell you without hesitating. For how those tiers translate into real Sydney prices, see our <a href="/blog/screen-repair-cost-sydney/">screen repair cost guide</a>, or <a href="/repairs/screen/riverwood/">drop into Riverwood Plaza</a> and we'll show you the options for your exact model.</p>
    `,
  },
  {
    slug: 'phone-not-charging-port-or-lint',
    tag: 'Guides',
    date: '14 May 2026',
    dateISO: '2026-05-14',
    read: '4 min read',
    img: '/images/port-repair.jpg',
    title: "Charging cable finicky? It's probably lint, not a broken port",
    excerpt: 'How to tell a dirty port from a dead one — and why you shouldn\'t go at it with a toothpick.',
    lede: 'If your cable only charges at a certain angle, or you have to wiggle it to get the light, don\'t assume the port is dead. Nine times out of ten it\'s packed with pocket lint — here\'s how to tell, and clear it, safely.',
    body: `
      <p>A charging port is an open hole that lives in your pocket all day. Lint, dust and fluff get pressed into the bottom of it every time you put the phone away, slowly forming a compacted plug that stops the cable from seating fully. The classic symptoms: the cable feels "shallow," it only charges at an angle, or it works with one cable and not another.</p>

      <h2>First, rule out the easy stuff</h2>
      <ul>
        <li><strong>Try a different cable and charger.</strong> Cables fail far more often than ports. If a known-good cable works, you're done.</li>
        <li><strong>Shine a light into the port.</strong> Use a torch and look straight in. A grey fuzzy block at the bottom is lint. Bent or missing pins, or green/white residue, point to a real port problem.</li>
        <li><strong>Note when it started.</strong> Gradual ("getting fussier for weeks") usually means lint. Sudden, right after a drop or a soak, points to damage.</li>
      </ul>

      <h2>How to clean it without wrecking it</h2>
      <p>The advice you've heard is "use a toothpick" — and that's how people snap pins and leave wood splinters behind. Do it properly instead:</p>
      <ol>
        <li><strong>Power the phone off first.</strong> Always.</li>
        <li><strong>Never use anything metal.</strong> A pin or needle can short the contacts or bend them. That's the one move that turns a free fix into a repair.</li>
        <li><strong>Use a wooden or plastic toothpick — gently.</strong> Slide it to the bottom, angle it slightly, and ease the lint plug out in one piece. Don't dig or scrape at the contacts.</li>
        <li><strong>Finish with a short puff of compressed air</strong> to clear anything loose. Avoid blowing with your mouth (moisture).</li>
      </ol>

      <div class="article-callout">
        <span class="callout-icon">✓</span>
        <span><strong>Not comfortable poking around in there?</strong> A port clean is part of our free diagnostic — we'll clear it and test charging at no charge, and only quote a repair if the port is actually faulty. <a href="/repairs/charging-port/">See charging port repair →</a></span>
      </div>

      <h2>When it really is the port</h2>
      <p>If a clean cable still won't charge after the port is clear, or you can see bent pins, looseness, or corrosion from a spill, the port itself needs replacing. It's a common, straightforward repair — usually same-day. <a href="/repairs/charging-port/">Drop into Riverwood Plaza</a> or call <a href="tel:+61295333300">(02) 9533 3300</a> and we'll tell you in a couple of minutes whether it's lint or a real fault.</p>
    `,
  },
  {
    slug: 'repair-or-upgrade-phone',
    tag: 'Guides',
    date: '7 May 2026',
    dateISO: '2026-05-07',
    read: '5 min read',
    img: '/images/diagnostic.jpg',
    title: 'Repair or upgrade? A simple framework for deciding',
    excerpt: 'The maths that tells you when a $79 battery beats a $1,400 handset — and when it doesn\'t.',
    lede: 'A cracked screen or a dying battery always raises the same question: is it worth fixing, or time for a new phone? Here\'s the simple framework we give customers — no upsell, just the maths.',
    body: `
      <p>The honest answer is "it depends," but it depends on only a few things. Run your phone through these and the decision usually makes itself.</p>

      <h2>The one-line rule</h2>
      <p><strong>If the repair costs less than about a quarter of replacing the phone, and the phone is under roughly three years old, repair it.</strong> A $79 battery or a $129 screen on a phone that would cost $1,000–$1,400 to replace is an easy call — you're spending well under 10% to get another year or two. The maths only gets interesting when the repair creeps toward half the replacement cost, or when more than one thing is wrong.</p>

      <h2>The four questions that decide it</h2>
      <h3>1. How old is it, and is it still getting updates?</h3>
      <p>A phone still receiving OS and security updates is worth keeping. Once the manufacturer drops support, that's a genuine reason to upgrade regardless of the repair cost.</p>
      <h3>2. How many things are actually wrong?</h3>
      <p>One fault — a screen, a battery, a port — is almost always worth fixing. Three faults at once usually means the phone has had a hard life, and the money is better put toward a replacement.</p>
      <h3>3. What's the repair as a share of a new phone?</h3>
      <p>Compare the quote to what you'd realistically pay for an equivalent handset — not the headline RRP of the latest flagship. A $149 screen against a $400 mid-ranger is a different decision than against a $1,800 flagship.</p>
      <h3>4. Do you actually <em>want</em> a new phone?</h3>
      <p>If you were itching to upgrade anyway, a fault is a fine trigger. If you're happy with what you've got, there's no virtue in spending ten times the repair cost to chase a slightly better camera.</p>

      <div class="article-callout">
        <span class="callout-icon">✓</span>
        <span><strong>We'll tell you straight.</strong> Our diagnostic is free, and if your phone genuinely isn't worth repairing we'll say so — we'd rather you trust us with the next one. <a href="/repairs/">See all repairs →</a></span>
      </div>

      <h2>A worked example</h2>
      <p>A three-year-old iPhone with poor battery health and a small screen crack. Battery: <a href="/repairs/battery/">$79</a>. Screen: <a href="/repairs/screen/">$149</a>. That's $228 against perhaps $900 to replace with a like-for-like handset — about 25%. Borderline on the rule, but the phone is otherwise healthy and still supported, so most people repair and run it another two years. If that same phone also had a failing camera and a dodgy port, the answer flips toward upgrading.</p>

      <h2>The bottom line</h2>
      <p>Repair when it's one fault, the phone's under three years old, and the fix is a fraction of a replacement. Upgrade when faults stack up, support has ended, or you wanted a new phone anyway. Still on the fence? <a href="/repairs/screen/riverwood/">Bring it into Riverwood Plaza</a> or call <a href="tel:+61295333300">(02) 9533 3300</a> for a free, no-pressure assessment.</p>
    `,
  },
];

export const POST_BY_SLUG = Object.fromEntries(POSTS.filter((p) => p.slug).map((p) => [p.slug, p]));
export const BLOG_TAGS = ['All posts', 'Screens', 'Batteries', 'Pricing', 'Guides'];
