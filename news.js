// ============================================================
//  IMMA NEWS — NEWS STORIES
//  Add a new story by copying one { ... } block and editing it.
//  Newest dates show first. Mark one story `featured: true`
//  to put it in the big spot at the top.
//
//  Fields:
//    title      headline
//    category   one word or short phrase — each new one gets its own tab
//    date       YYYY-MM-DD
//    image      picture link or "images/your-photo.jpg" (leave "" for the IMMA placeholder)
//    caption    optional photo credit
//    summary    one or two sentences for the story list
//    body       full story — leave a blank line between paragraphs
//    source / sourceUrl   optional credit for the original reporting
//
//  Search & Google News (used by tools/build_articles.js):
//    slug         short web address, e.g. "nairobi-building-collapses-nine-killed"
//                 (the page is /news/<section>/<slug>/). Never change it once published.
//    seoTitle     title shown in Google, 60 characters or fewer
//    description  snippet shown in Google, 155 characters or fewer
//    author       id from tools/authors.json (default: the IMMA News Editorial Desk)
//    updated      YYYY-MM-DD when a published story is meaningfully updated
//    published    optional exact time, e.g. "2026-11-25T09:30:00+03:00"
//  After adding or editing stories run:  node tools/build_articles.js
// ============================================================
const NEWS = [
  {
    title: "eCitizen Users Told to Change Passwords as Government Probes Hacking Claim",
    category: "Kenya",
    slug: "ecitizen-hacking-claim-change-passwords",
    seoTitle: "eCitizen Hacking Claim: Users Told to Change Passwords",
    description: "Kenya's government is probing claims that hackers took eCitizen data. No breach is confirmed, but users are urged to set strong, unique passwords.",
    date: "2026-11-25",
    featured: true,
    image: "https://images.unsplash.com/photo-1584433144859-1fc3ab64a957?auto=format&fit=crop&w=1600&q=75",
    caption: "Illustrative image: a smartphone showing a security lock. Photo: Dan Nelson / Unsplash.",
    summary: "The State Department for Immigration and Citizen Services says it is investigating online reports that hackers took data from eCitizen. It has not confirmed a breach, but is urging users to switch to strong, unique passwords.",
    body: `The government is investigating claims that hackers broke into eCitizen, the online portal Kenyans use for passports, business registration, permits and dozens of other state services.

Investigation: The State Department for Immigration and Citizen Services said on Tuesday, November 24, that it had seen reports of unauthorised access to eCitizen data and that technical and security staff were working to establish how far any incident went. It has not confirmed that personal information was taken.

The claim: The allegation comes from a hacking group calling itself ByteToBreach, which says it took about 740GB of files. According to technology outlets that reviewed the claim, the group says the haul includes roughly 600GB of identity documents collected for "know your customer" checks, around 100GB of database records and about 40GB of source code. None of these figures has been independently confirmed.

What users should do: The department advised anyone who uses their eCitizen password on other websites to change it and pick a strong password that is not used anywhere else. It also warned that fraudsters may use the news to send fake phone calls, SMS, emails and web links that claim to come from eCitizen. Officials reminded the public that eCitizen will never ask for a password or a one-time PIN.

Services running: The department said the platform remains available and Kenyans can keep using it as normal. It promised updates through official channels as the investigation continues and asked the public and the media not to spread unverified information.

IMMA News will update this story when investigators release their findings.`,
    sources: [
      { name: "Kenyans.co.ke — Kenyans advised to change eCitizen passwords", url: "https://www.kenyans.co.ke/news/129647-kenyans-advised-change-ecitizen-passwords-after-reports-data-breach" },
      { name: "The Star — Government investigates alleged eCitizen data breach", url: "https://www.the-star.co.ke/news/2026-11-24-state-probes-alleged-ecitizen-data-breach" },
      { name: "Techweez — eCitizen named in unverified data breach allegation", url: "https://techweez.com/2026/11/24/ecitizen-data-breach-claim-bytetobreach/" }
    ]
  },
  {
    title: "KWS Begins Rhino-by-Rhino Count at Ol Pejeta After 17 Deaths",
    category: "Kenya",
    slug: "kws-ol-pejeta-rhino-count-17-deaths",
    seoTitle: "KWS Starts Ol Pejeta Rhino Count After 17 Deaths",
    description: "Wildlife officials are auditing the black rhinos at Ol Pejeta Conservancy in Laikipia after 17 died this year. The conservancy says none was poached.",
    date: "2026-11-25",
    image: "https://images.unsplash.com/photo-1790866268427-52d90d386804?auto=format&fit=crop&w=1600&q=75",
    caption: "Illustrative image: a black rhino in the Maasai Mara, not at Ol Pejeta. Photo: Dmitrii Zhodzishskii / Unsplash.",
    summary: "Wildlife officials have started an audit of the black rhinos at Ol Pejeta Conservancy in Laikipia after 17 died this year. The conservancy says none of the deaths was caused by poaching.",
    body: `The Kenya Wildlife Service (KWS) has started a full audit of the black rhinos at Ol Pejeta Conservancy in Laikipia County after the conservancy recorded 17 rhino deaths in less than nine months.

The audit: KWS Director General Prof Erustus Kanga launched the exercise on Tuesday, November 24, together with the Laikipia County Commissioner and the county police commander. Rhino experts from the state-run Wildlife Research and Training Institute (WRTI) are taking part, along with monitors from neighbouring conservancies including Lewa, Borana, Loisaba and Segera.

How it works: The team will try to find and identify every rhino on the conservancy, calves included, assess how healthy each animal looks and photograph it with the date recorded. Those records will then be compared with the official KWS register so that births, deaths and movements can be accounted for. KWS says the audit will also look at how the conservancy monitors its rhinos and how quickly it reports to the wildlife service.

The deaths: In a statement earlier this month, Ol Pejeta said it lost 17 black rhinos from February 26 to November 12 this year. By its count, five were confirmed or suspected lion kills, four were put down to old age, two to downer syndrome, two to disease and one to drowning. The cause of the other three has not been established. The conservancy says joint veterinary checks with KWS found no sign of poaching, and that the horns recovered are in KWS custody.

Crowded habitat: Ol Pejeta says its black rhino population, put at about 179 animals, is now above the roughly 120 its land can support over the long term. It also pointed to dry weather: rainfall between April and October was about 56 per cent of the average for the same months over the previous five years. The conservancy has called for more room for rhinos, and WRTI is separately working out a new estimate of how many the land can hold.

KWS has not said when the audit's findings will be released.`,
    sources: [
      { name: "The Eastleigh Voice — KWS begins headcount of Ol Pejeta rhinos", url: "https://eastleighvoice.co.ke/national/427645/kws-begins-headcount-of-ol-pejeta-rhinos-after-17-deaths" },
      { name: "Kenyans.co.ke — KWS launches rhino audit at Ol Pejeta", url: "https://www.kenyans.co.ke/news/129653-kws-launches-rhino-audit-ol-pejeta-following-mysterious-deaths" },
      { name: "Ol Pejeta Conservancy — statement on rhino conservation challenges", url: "https://www.olpejetaconservancy.org/2026/11/14/ol-pejeta-faces-rhino-conservation-challenges-as-population-growth-adds-pressure-on-habitat/" }
    ]
  },
  {
    title: "Ruto Adds Ksh5 Billion to Hustler Fund and Lifts Loans to Ksh150,000",
    category: "Kenya",
    slug: "hustler-fund-ksh5-billion-loan-limit-ksh150000",
    seoTitle: "Hustler Fund Gets Ksh5bn, Loan Limit Rises to Ksh150,000",
    description: "President Ruto is adding Ksh5 billion to the Hustler Fund and moving about 4.5 million regular borrowers to loans of up to Ksh150,000.",
    date: "2026-11-25",
    image: "https://images.unsplash.com/photo-1637997840862-9aafaf835eed?auto=format&fit=crop&w=1600&q=75",
    caption: "Illustrative image: women at work at a tailoring school in Nairobi. Photo: Kevin Menya / Unsplash.",
    summary: "President Ruto says the government will add a further Ksh5 billion to the Hustler Fund and move about 4.5 million regular borrowers to a loan product offering up to Ksh150,000 each.",
    body: `President William Ruto has announced an extra Ksh5 billion for the Hustler Fund, the government's mobile lending scheme for small traders and individuals.

The announcement: Speaking on Tuesday, November 24, at an event in Nairobi marking 17 years of the Joyful Women Organisation, the President said the new money was meant to deal with a shortage of money for people borrowing through the platform.

Bigger loans: He said about 4.5 million regular borrowers will be moved to the fund's bridge loan facility, under which individuals can borrow up to Ksh150,000. The amount each person can actually get will still depend on their eligibility and borrowing record.

Group lending: The President also asked the Principal Secretary in charge of the fund to create a Ksh300 million product for groups, which would let groups receive money and decide for themselves how to lend it to their members.

Background: The Hustler Fund was launched in late 2022 to give people small, low-interest loans through their mobile phones. The bridge facility existed before this announcement; what is new is the extra capital and the plan to move millions more borrowers onto it.

The President did not give a date for when the changes will take effect. Borrowers are advised to watch for official updates from the Hustler Fund.`,
    sources: [
      { name: "KBC — Hustler Fund gets Ksh5B boost as Ruto raises borrowing limits", url: "https://www.kbc.co.ke/hustler-fund-gets-ksh5b-boost-as-ruto-raises-borrowing-limits/" },
      { name: "People Daily — Ruto injects Ksh5 billion into Hustler Fund", url: "https://peopledaily.digital/news/ruto-injects-ksh5-billion-into-hustler-fund-raises-loan-limits" },
      { name: "Kenyans.co.ke — Ruto increases Hustler Fund capital", url: "https://www.kenyans.co.ke/news/129636-ruto-increases-hustler-fund-capital-ksh5-billion-raises-borrowing-limits" }
    ]
  },
  {
    title: "US Jury Finds Huawei Guilty of Trade Secrets Conspiracy and Bank Fraud",
    category: "International",
    slug: "huawei-guilty-trade-secrets-conspiracy",
    seoTitle: "US Jury Finds Huawei Guilty of Trade Secrets Conspiracy",
    description: "A Brooklyn federal jury convicted Huawei on 10 of 12 counts but cleared it of racketeering, the most serious charge. Huawei says it will appeal.",
    date: "2026-11-25",
    image: "https://images.unsplash.com/photo-1779517670485-2976bc8e81b2?auto=format&fit=crop&w=1600&q=75",
    caption: "Illustrative image: a Huawei sign on an office building. Photo: Vong Vathanak / Unsplash.",
    summary: "A federal jury in Brooklyn has convicted the Chinese telecoms giant on 10 of 12 counts but cleared it of racketeering, the most serious charge. Huawei says it will appeal.",
    body: `A jury in New York has convicted Huawei Technologies of conspiring to steal trade secrets and of bank fraud, in a case that US prosecutors first brought in 2018.

The verdict: The federal jury in Brooklyn returned its decision on Tuesday, November 24. Huawei was found guilty on 10 of the 12 counts it faced, including bank fraud, conspiracy to steal trade secrets and conspiracy to defraud the United States. Jurors acquitted the company of racketeering conspiracy, the most serious charge, and of conspiracy to obstruct justice.

The case: Prosecutors argued that Huawei took technology from rivals and partners over many years while building itself into a leading global supplier of telecoms network equipment. They also accused it of doing business in sanctioned countries such as Iran and North Korea and of misleading banks and US officials to hide those dealings. Evidence at trial included alleged attempts to obtain router source code from Cisco and antenna technology from the wireless firm Quintel.

Huawei's response: The company's lawyer, Brian Heberlig, said Huawei would appeal. He described the acquittal on racketeering as a vindication, arguing that it was the only charge tying all the allegations together. During the trial, the defence said prosecutors had built a story of a grand conspiracy out of isolated mistakes by a handful of staff at a company with over 200,000 workers.

Background: The case became public in December 2018, when Huawei's chief financial officer, Meng Wanzhou, was arrested in Canada at the request of the United States. She later reached a deal with US prosecutors and returned to China, and her case was later dismissed. Further charges against the company, including the trade secrets counts, were added in 2020.

No sentence has been announced. Huawei is already barred from selling network equipment to US carriers, and several Western countries, including the United Kingdom and Canada, have restricted its equipment.`,
    sources: [
      { name: "Al Jazeera (AP and Reuters) — Huawei found guilty of trade secrets conspiracy", url: "https://www.aljazeera.com/economy/2026/11/24/chinese-tech-giant-huawei-found-guilty-of-conspiracy-to-steal-trade-secrets" },
      { name: "France 24 — New York jury convicts Huawei of stealing trade secrets", url: "https://www.france24.com/en/americas/20261124-new-york-jury-convicts-huawei-of-stealing-trade-secrets" }
    ]
  },
  {
    title: "China Flies Its First Foreign Astronaut as Pakistan's Zeeshan Ali Heads to Tiangong",
    category: "International",
    slug: "china-first-foreign-astronaut-pakistan-zeeshan-ali",
    seoTitle: "Pakistan's Zeeshan Ali Is China's First Foreign Astronaut",
    description: "Shenzhou-24 has lifted off with two Chinese astronauts and Pakistan's Muhammad Zeeshan Ali, the first foreigner to visit China's space station.",
    date: "2026-11-25",
    image: "https://images.unsplash.com/photo-1541185934-01b600ea069c?auto=format&fit=crop&w=1600&q=75",
    caption: "Illustrative image: a rocket launch trail at night, not the Shenzhou-24 launch. Photo: SpaceX / Unsplash.",
    summary: "The Shenzhou-24 spacecraft has lifted off from northwest China carrying two Chinese astronauts and Muhammad Zeeshan Ali, the first non-Chinese astronaut to visit China's space station.",
    body: `China has sent a Pakistani astronaut into orbit, making him the first person from outside China to travel to its Tiangong space station.

The launch: The Shenzhou-24 spacecraft rose from the Jiuquan launch centre in the country's north-west early on Wednesday, November 25. Reuters reported the launch time as 8:18am local time. Chinese state media said the spacecraft detached from its launcher and entered its intended orbit.

The crew: On board are Muhammad Zeeshan Ali, 40, a Pakistani pilot; the mission commander, Tang Hongbo (51), and Wu Yi (39). For Ali and Wu, it is a first trip to space. Tang is a veteran of two earlier flights and, according to state broadcaster CCTV, will become the first astronaut to visit Tiangong three times.

Ali's role: Ali is flying as a payload specialist on a short stay expected to last between five and ten days. Among his tasks is an experiment with cyanobacteria, microbes that use sunlight to make energy. He is due to return to Earth on board Shenzhou-23. Chinese media say the three will conduct over 90 experiments and technology tests.

Reaction in Pakistan: Pakistanis followed the launch on television, and Prime Minister Shehbaz Sharif said the mission made the whole nation proud. Ali's seat was secured under a deal Beijing and Islamabad signed in February 2025.

Bigger picture: China's goal is a crewed Moon landing by 2030, while the United States plans its own crewed lunar landing in 2028.`,
    sources: [
      { name: "Euronews — China sends first foreign astronaut to its space station", url: "https://www.euronews.com/2026/11/25/china-sends-first-foreign-astronaut-to-its-space-station-as-pakistani-joins-shenzhou-24-cr" },
      { name: "US News (Reuters) — Shenzhou-24 takes off with Pakistani national", url: "https://www.usnews.com/news/world/articles/2026-11-24/chinas-shenzhou-24-space-flight-takes-off-with-pakistani-national-as-first-foreign-astronaut" },
      { name: "KSAT (AP) — China launches Shenzhou 24 with a Pakistani astronaut", url: "https://www.ksat.com/tech/2026/11/25/china-launches-shenzhou-24-spacecraft-carrying-2-chinese-and-a-pakistani-astronaut/" }
    ]
  },
  {
    title: "Kenya's Mirriam Cherop Wins Thrilling Cross-Country Race in Spain",
    category: "Sports",
    slug: "mirriam-cherop-wins-atapuerca-cross-country",
    seoTitle: "Mirriam Cherop Wins Atapuerca Cross-Country Race in Spain",
    description: "Kenya's Mirriam Cherop sprinted past two Ethiopians to win the women's race at Spain's Cross Internacional de Atapuerca, a World Athletics Gold event.",
    date: "2026-11-23",
    image: "https://images.unsplash.com/photo-1760114852702-9c65fe257a52?auto=format&fit=crop&w=1600&q=75",
    caption: "Illustrative image: a running track at an athletics venue, not the Atapuerca race. Photo: Sincerely Media / Unsplash.",
    summary: "Kenyan distance runner Mirriam Cherop produced a powerful finishing sprint to win the women's race at the Cross Internacional de Atapuerca in Spain, defeating two Ethiopian challengers in a World Athletics Cross Country Tour Gold event.",
    body: `Kenya's Mirriam Cherop delivered an impressive performance on Sunday, November 22, winning the women's 7.8km race at the Cross Internacional de Atapuerca in Spain in 25 minutes and 56 seconds.

The competition attracted leading international runners, including defending champion Nadia Battocletti of Italy and Ethiopian contenders Wosane Asefa and Asefa Abreha. The race was held in windy conditions, with several athletes taking turns at the front.

Cherop remained among the leading runners as the race progressed. During the final stages, she faced a fierce challenge from the Ethiopian pair, who maintained a strong pace approaching the finish.

With approximately 50 metres remaining, Cherop accelerated past Abreha to claim victory. Asefa also overtook her compatriot to finish second, while Abreha settled for third. All three athletes recorded an official time of 25:56.

Another Kenyan, Brenda Jepchumba Kenei, finished fourth in 25:58, giving Kenya two places among the leading four women.

In the men's race, Spain's Rodrigue Kwizera won in 22:38, ahead of Ethiopia's Berihu Aregawi and Fasika Ayele. Kenyans Mathew Kipsang and Charles Kiboino finished fourth and fifth respectively.

Cherop's victory adds to Kenya's strong international cross-country performances and provides further encouragement for the country's distance-running programme.`,
    source: "World Athletics",
    sourceUrl: "https://worldathletics.org/competitions/world-athletics-cross-country-tour/news/kwizera-cherop-2026-cross-internacional-atapuerca"
  },

  {
    title: "Kabras Sugar Defeat KCB 20-15 in Kenya Cup Season Opener",
    category: "Sports",
    slug: "kabras-sugar-beat-kcb-kenya-cup-opener",
    seoTitle: "Kabras Sugar Beat KCB 20-15 in Kenya Cup Season Opener",
    description: "Champions Kabras Sugar opened their 2026/27 Kenya Cup campaign with a 20-15 win over KCB Rugby in Kakamega, with Rayvone Ambale scoring twice.",
    date: "2026-11-23",
    image: "https://images.unsplash.com/photo-1791714997655-bd35fd515db9?auto=format&fit=crop&w=1600&q=75",
    caption: "Illustrative image: a rugby ball on a grass field. Photo: Xander Sauviller / Unsplash.",
    summary: "Defending champions Kabras Sugar began their 2026/27 Kenya Cup campaign with a 20-15 victory over rivals KCB Rugby in Kakamega. Rayvone Ambale scored twice as the champions extended their remarkable unbeaten run.",
    body: `Kabras Sugar RFC opened their Kenya Cup title defence with a hard-fought 20-15 victory over KCB Rugby at the Kakamega Showgrounds.

The defending champions faced an early setback when KCB's Austin Sikutwa crossed the try line to put the visitors ahead. Kabras responded through Jackson Siketa, whose try was converted by Samuel Omollo to establish a 7-5 lead.

Rayvone Ambale then took control of the contest, scoring two tries as Kabras increased their advantage. KCB responded through Bob Muhati, but an Omollo penalty gave the hosts a 20-10 lead at halftime.

KCB fought back in the second half, with Richell Wangila scoring a try to reduce the deficit to five points. However, Kabras defended their narrow advantage and secured victory in the opening fixture of the new season.

The result extended Kabras Sugar's unbeaten run to 55 matches, underlining the club's dominance in Kenya's top domestic rugby competition.

Elsewhere in the opening round, Kenya Harlequin defeated Strathmore Leos 31-25, while Blak Blad overcame Mwamba 27-25.

The opening weekend demonstrated the competitive nature of Kenyan club rugby, with several matches decided by narrow margins. Kabras will be seeking to maintain their winning momentum as the season progresses, while KCB will aim to recover quickly from their opening defeat.`,
    source: "The Standard",
    sourceUrl: "https://www.standardmedia.co.ke/sports/rugby/article/2001562776/kabras-see-off-kcb-to-kick-off-kenya-cup-title-defence-in-style"
  },

  {
    title: "Liverpool Thrash Manchester United 4-0 in Premier League Showdown",
    category: "Sports",
    slug: "liverpool-beat-manchester-united-4-0",
    seoTitle: "Liverpool Thrash Man United 4-0 in Pochettino's First Game",
    description: "Liverpool beat ten-man Manchester United 4-0 on Sunday, November 22, in a difficult first match in charge for United manager Mauricio Pochettino.",
    date: "2026-11-23",
    image: "/images/stories/football-stadium-aerial-1600.webp",
    caption: "Illustrative image: aerial view of a football stadium, not the Liverpool–Manchester United match. Photo: Antonio Ochoa / Pexels.",
    summary: "Liverpool secured an emphatic 4-0 victory over ten-man Manchester United on Sunday, November 22, in a difficult first match for United manager Mauricio Pochettino.",
    body: `Liverpool delivered one of the standout results of the Premier League weekend, defeating Manchester United 4-0 on Sunday, November 22, in a commanding performance against their traditional rivals.

Manchester United's hopes of securing a positive result suffered a major setback when defender Leny Yoro received an early red card, leaving the visitors with ten players for much of the contest.

Liverpool capitalised on their numerical advantage, with Dominik Szoboszlai, Florian Wirtz, Rio Ngumoha and Munoz all finding the net to complete the four-goal victory.

The result represented a difficult opening match for Mauricio Pochettino as Manchester United manager. His side struggled defensively against Liverpool's attacking pressure and were unable to mount a successful response.

For Kenyan and African football supporters, the fixture was another major talking point in a league that attracts a substantial following across the continent. Liverpool's convincing victory will intensify discussion about the balance of power between the two historic English clubs.

Manchester United will now face renewed scrutiny over their defensive organisation, while Liverpool will look to build on the result in their upcoming Premier League fixtures.`,
    source: "Premier League",
    sourceUrl: "https://www.premierleague.com/en/news/4764883/liverpool-thrash-10-man-man-utd-in-pochettinos-first-match"
  },

  {
    title: "Medically Assisted Weight Loss: Safe Options and Medical Support Explained",
    category: "Health",
    slug: "medically-assisted-weight-loss-kenya",
    seoTitle: "Medically Assisted Weight Loss in Kenya: Safe Options",
    description: "A guide to medically supervised weight-loss programmes, prescription treatments and procedures, their risks, and how to get care in Kenya.",
    date: "2026-11-23",
    image: "/images/stories/doctor-patient-consultation-1600.webp",
    caption: "A doctor consulting with a patient. Photo: Thirdman / Pexels.",
    extraImages: [
      { image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1400&q=75",
        caption: "A bowl of fresh vegetable salad as part of a balanced meal. Photo: Anna Pelzer / Unsplash." },
      { image: "/images/stories/trainers-outdoors-1600.webp",
        caption: "Casual trainers outdoors, a reminder of everyday physical activity. Photo: Duygu / Pexels." }
    ],
    summary: "Managing weight safely often involves more than willpower alone. This guide outlines medically supervised programmes, prescription treatments, procedures, safety risks, and how to access care in Kenya.",
    body: `Who assisted weight loss is for: Healthcare providers usually assess whether medical support makes sense by looking at a person's Body Mass Index (BMI) alongside overall health, family history, and weight-related conditions. While BMI is a common screening tool that compares weight to height, clinicians also check blood pressure, blood sugar, cholesterol, sleep quality, and mobility. Assisted options are often considered when a person has obesity or is overweight with conditions such as type 2 diabetes, high blood pressure, or heart disease risks, especially if earlier lifestyle changes alone have not been enough to protect their health.

Medically supervised diet and lifestyle programmes: Structured programmes bring together doctors, registered dietitians or nutritionists, and behavioural or mental health support to help build realistic, lasting routines. Instead of extreme crash diets, medical nutrition focuses on balanced meals, sensible portion sizes, regular physical activity, and practical habits that fit daily life and culture. Behavioural support helps people navigate stress, emotional eating, sleep habits, and setbacks without guilt.

Prescription weight-loss medicines: When lifestyle changes alone are not achieving needed health improvements, a doctor may consider prescription medications. Depending on a person's medical profile, prescribed options may reduce appetite, increase feelings of fullness, slow stomach emptying, or affect how nutrients are absorbed or processed. Common side effects often involve the digestive system, such as nausea, bloating, constipation, diarrhoea, or reflux, and some medicines carry specific cautions depending on a person's medical history. Because these treatments act on body systems and hormones, they require a doctor's prescription, careful screening, and regular medical follow-up.

Weight-loss (bariatric) surgery: Bariatric operations change the size of the stomach or reroute part of the digestive tract to limit food intake and alter hunger and fullness signals. Common approaches include sleeve gastrectomy, which removes a large portion of the stomach to form a narrower sleeve, and gastric bypass procedures, which create a smaller stomach pouch and connect it directly to the small intestine. Eligibility generally depends on BMI thresholds, weight-related illnesses, readiness for lifestyle change, and surgical safety after a thorough medical evaluation.

Benefits, risks, and lifelong follow-up after surgery: Bariatric surgery can support substantial weight reduction and meaningfully improve conditions like type 2 diabetes, high blood pressure, and high cholesterol. However, like any major operation, it carries risks such as infection, bleeding, leaks, bowel changes, or weight regain over time. Because altering digestion can reduce how well the body absorbs certain vitamins and minerals, lifelong nutrition monitoring, prescribed supplements, and regular check-ups with the care team are essential.

Non-surgical procedures: Less invasive endoscopic options use a thin, flexible camera tube passed through the mouth rather than external surgical cuts. Examples include endoscopic sleeve gastroplasty, which places internal stitches to narrow the stomach into a smaller tube, and intragastric balloons placed temporarily in the stomach to take up space and promote fullness. Recovery is often faster than with open or keyhole surgery, though temporary nausea, cramping, or reflux can occur, and lasting results still depend on ongoing nutrition and lifestyle habits.

Risks of unregulated "slimming" pills, teas and injections: Unverified weight-loss capsules, herbal teas, powders, and injectables sold online, on social media, or in open markets pose serious health hazards. Unregulated products may contain hidden stimulants, laxatives, or undeclared drugs, or be counterfeit or contaminated, risking heart strain, severe dehydration, liver or kidney harm, dangerous blood sugar drops, or serious infections. Health agencies warn that unapproved or falsified slimming products lack reliable safety testing and should be avoided.

How to get help in Kenya: A practical first step in Kenya is to book a general consultation at a reputable public or private clinic or hospital to check your BMI, blood pressure, blood sugar, and general health. From there, a general practitioner can refer you to a registered dietitian or nutritionist, a physician or endocrinologist, or a multidisciplinary weight and non-communicable disease clinic if specialised care is appropriate. Asking questions about costs, availability, and ongoing monitoring helps ensure any plan fits safely into your life.

Please note: This article is for general information only and is not medical advice; always talk to a qualified doctor before starting, changing, or stopping any weight-loss treatment, medicine, or procedure.`,
    sources: [
      { name: "NHS — Overweight and obesity in adults", url: "https://www.nhs.uk/conditions/overweight-and-obesity/" },
      { name: "Mayo Clinic — Weight-loss basics", url: "https://www.mayoclinic.org/healthy-lifestyle/weight-loss/basics/weightloss-basics/hlv-20049483" }
    ]
  },

  // Long-form article: format "markdown" allows ### headings, lists, **bold** and tables.
  {
    title: "7 High-Protein, High-Fibre Kenyan Meals for Healthy Weight Management",
    category: "Health",
    slug: "high-protein-high-fibre-kenyan-meals",
    seoTitle: "7 High-Protein, High-Fibre Kenyan Meals for Healthy Weight",
    description: "Seven affordable Kenyan recipes rich in protein and fibre to keep you full, with ingredients, methods and estimated nutrition per serving.",
    date: "2026-11-23",
    format: "markdown",
    image: "https://images.unsplash.com/photo-1666181551815-b9adecb24e46?auto=format&fit=crop&w=1600&q=75",
    caption: "Fish with ugali and kachumbari salad. Photo: Keesha's Kitchen / Unsplash.",
    summary: "Balanced meals rich in protein and dietary fibre help promote fullness and steady energy. Here are seven affordable, flavourful Kenyan-inspired recipes with estimated nutrition and practical preparation tips.",
    body: `Sustainable weight management rarely comes from skipping meals or following restrictive fad diets. Instead, public health bodies including the World Health Organization (WHO), the UK National Health Service (NHS), and the Harvard T.H. Chan School of Public Health emphasise balanced eating patterns built around whole foods, adequate lean protein, and plenty of dietary fibre. Protein helps preserve muscle mass and increases satiety after eating, while dietary fibre slows digestion, supports gut health, and helps keep blood glucose levels steady.

No single recipe guarantees weight loss on its own, because long-term body weight depends on overall energy balance, regular physical activity, sleep, stress, and individual medical factors. However, building everyday meals around affordable Kenyan staples—such as beans, lentils, green grams (ndengu), omena, tilapia, chicken, eggs, sukuma wiki, cabbage, and wholegrain ugali or brown rice—makes nutritious eating practical and enjoyable. The seven recipes below provide roughly 18–48 g of protein and 9–19 g of fibre per serving using accessible ingredients.

<figure class="extra">
  <img src="https://images.unsplash.com/photo-1763368403529-0b8d9108cf9c?auto=format&fit=crop&w=1400&q=75" alt="" loading="lazy">
  <figcaption>Dried beans and legumes for sale at a market stall. Photo: Zoshua Colah / Unsplash.</figcaption>
</figure>

### Nutritional comparison across all seven meals

*All nutrition values are estimates per serving, calculated from the ingredient amounts in each recipe using standard food composition data (USDA FoodData Central). They will vary with exact ingredients, oil absorption and portion sizes.*

| Meal | Calories (kcal) | Protein (g) | Fibre (g) |
| --- | --- | --- | --- |
| 1. Spiced Ndengu & Coconut Stew with Brown Rice | 605 | 26 | 17 |
| 2. Grilled Tilapia with Sukuma Wiki, Kachumbari & Brown Ugali | 580 | 48 | 15 |
| 3. Nyoyo (Githeri) with Avocado & Steamed Cabbage | 425 | 18 | 19 |
| 4. Kenyan Chicken & Chickpea Curry with Wholemeal Chapati | 470 | 36 | 12 |
| 5. Omena & Peanut (Njugu) Stew with Wholegrain Ugali & Managu | 520 | 33 | 9 |
| 6. Spiced Kamande (Brown Lentil) & Beef Mince Bowl | 475 | 31 | 9 |
| 7. Masala Egg & Red Kidney Bean Shakshuka with Wholegrain Toast | 525 | 32 | 15 |

### 1. Spiced Ndengu & Coconut Stew with Brown Rice

Green grams (ndengu) simmered with tomatoes, garlic, ginger, and light coconut milk create a comforting, plant-forward meal packed with soluble and insoluble fibre. Pairing the legumes with wholegrain brown rice provides complementary amino acids and sustained fullness without heavy saturated fat.

**Serves 4 · Prep 15 min (plus soaking) · Cook 40 min**

**Ingredients**

- 300 g dried green grams (ndengu), rinsed and soaked for 4 hours (or 750 g cooked)
- 240 g uncooked brown rice, rinsed
- 15 ml (1 tablespoon) vegetable or sunflower oil
- 150 g red onion, finely chopped
- 15 g (1 tablespoon) fresh garlic, minced
- 15 g (1 tablespoon) fresh ginger, grated
- 2 teaspoons ground cumin
- 1 teaspoon ground coriander
- 0.5 teaspoon ground turmeric
- 300 g ripe tomatoes, finely diced
- 200 ml light coconut milk
- 400 ml water or low-salt vegetable stock
- 120 g fresh baby spinach or finely shredded sukuma wiki
- 3 g (0.5 teaspoon) salt, or to taste
- 15 g fresh coriander (dhania), chopped

**Method**

1. Place the rinsed brown rice in a saucepan with 600 ml of water and a pinch of salt. Bring to a boil, reduce heat to low, cover tightly, and simmer for 35–40 minutes until tender. Fluff with a fork and keep warm.
2. Meanwhile, boil the soaked ndengu in fresh water for 20–25 minutes until tender but still holding their shape, then drain.
3. Heat the oil in a large pan over medium heat. Add the chopped onion and sauté for 5 minutes until softened.
4. Stir in the garlic, ginger, cumin, ground coriander, and turmeric, cooking for 1 minute until fragrant.
5. Add the diced tomatoes and cook for 6–8 minutes until they break down into a thick sauce.
6. Tip in the cooked ndengu, light coconut milk, stock, and salt. Simmer gently uncovered for 10 minutes so the flavours meld.
7. Fold in the spinach or sukuma wiki and cook for 2 minutes until just wilted. Garnish with fresh dhania and serve alongside the brown rice.

**Per serving (estimate):** 605 kcal · 26 g protein · 17 g fibre

### 2. Grilled Tilapia with Sukuma Wiki, Kachumbari & Brown Ugali

Tilapia provides high-quality, lean protein with minimal saturated fat, making it ideal for satiety and muscle maintenance. Serving it with lightly sautéed sukuma wiki, fresh tomato-onion kachumbari, and wholegrain (wimbi-blended or whole-maize) ugali delivers substantial fibre and micronutrients.

**Serves 2 · Prep 15 min · Cook 25 min**

**Ingredients**

- 360 g fresh tilapia fillets (two 180 g fillets), patted dry
- 15 ml (1 tablespoon) lemon juice
- 10 g (2 teaspoons) garlic and ginger paste
- 1 teaspoon paprika
- 15 ml (1 tablespoon) olive or sunflower oil, divided
- 300 g sukuma wiki (collard greens), tough stems removed and finely sliced
- 100 g red onion, finely diced, divided
- 200 g ripe tomatoes, diced
- 15 g fresh coriander (dhania), chopped
- 140 g wholegrain maize meal (or 100 g whole maize meal mixed with 40 g finger millet/wimbi flour)
- 450 ml water
- 3 g (0.5 teaspoon) salt, divided

**Method**

1. Rub the tilapia fillets with lemon juice, garlic-ginger paste, paprika, 5 ml (1 teaspoon) oil, and a pinch of salt. Set aside to marinate for 10 minutes.
2. Prepare the kachumbari by tossing the diced tomatoes, half of the diced red onion, dhania, a squeeze of lemon juice, and a pinch of salt in a bowl. Set aside.
3. Heat 5 ml (1 teaspoon) oil in a non-stick grill pan or skillet over medium-high heat. Cook the tilapia for 4–5 minutes per side until opaque and flaky throughout.
4. In a separate pan, heat the remaining 5 ml (1 teaspoon) oil over medium heat, sauté the remaining onion for 3 minutes, then add the sliced sukuma wiki and a pinch of salt. Toss for 3–4 minutes until bright green and tender-crisp.
5. Bring 450 ml of water to a rolling boil in a heavy-bottomed sufuria. Gradually whisk in the wholegrain maize and wimbi flour to avoid lumps, then turn with a wooden mwiko over low heat for 8–10 minutes until firm and cooked through. Serve hot with the tilapia, greens, and kachumbari.

**Per serving (estimate):** 580 kcal · 48 g protein · 15 g fibre

### 3. Nyoyo (Githeri) with Avocado & Steamed Cabbage

Traditional Kenyan githeri combines boiled maize and beans into a naturally fibre-dense one-pot meal that digests slowly and keeps hunger at bay for hours. Adding fragrant spices, plenty of lightly steamed cabbage, and a modest portion of creamy avocado boosts volume, healthy monounsaturated fats, and nutrient absorption.

**Serves 4 · Prep 15 min · Cook 25 min (using pre-boiled maize and beans)**

**Ingredients**

- 500 g boiled red kidney beans (or Rosecoco beans), drained
- 350 g boiled whole maize kernels, drained
- 15 ml (1 tablespoon) vegetable oil
- 150 g red onion, chopped
- 10 g (2 teaspoons) garlic, minced
- 1 teaspoon ground cumin
- 1 teaspoon curry powder
- 250 g tomatoes, chopped
- 150 g carrots, diced
- 250 ml water or low-salt vegetable stock
- 400 g green cabbage, thinly shredded
- 160 g ripe avocado (about 1 medium avocado), sliced
- 3 g (0.5 teaspoon) salt, or to taste
- 15 g fresh coriander (dhania), chopped

**Method**

1. Heat the oil in a large sufuria over medium heat. Add the chopped onion and sauté for 4–5 minutes until translucent.
2. Stir in the garlic, cumin, and curry powder, cooking for 1 minute until aromatic.
3. Add the tomatoes and diced carrots, cooking for 5 minutes until the tomatoes soften.
4. Tip in the boiled beans, boiled maize, water or stock, and salt. Bring to a simmer and cook uncovered for 12–15 minutes until the carrots are tender and the sauce thickens around the grains.
5. Meanwhile, steam or lightly sauté the shredded cabbage with 2 tablespoons of water and a pinch of salt for 4 minutes until tender-crisp.
6. Stir fresh dhania into the githeri and serve alongside the steamed cabbage, topped with sliced avocado.

**Per serving (estimate):** 425 kcal · 18 g protein · 19 g fibre

### 4. Kenyan Chicken & Chickpea Curry with Wholemeal Chapati

Combining lean skinless chicken breast with fibre-rich chickpeas stretches the meat further while delivering a robust dose of both protein and prebiotic fibre. Serving the curry with a single homemade wholemeal chapati rather than multiple refined white chapatis helps manage overall calorie intake while keeping the meal deeply satisfying.

**Serves 4 · Prep 20 min · Cook 30 min**

**Ingredients**

- 400 g skinless chicken breast, cut into 2 cm cubes
- 240 g cooked chickpeas (1 tin, drained and rinsed)
- 15 ml (1 tablespoon) vegetable oil, plus 10 ml (2 teaspoons) for brushing chapatis
- 150 g red onion, finely chopped
- 15 g (1 tablespoon) ginger-garlic paste
- 2 teaspoons mild curry powder
- 1 teaspoon garam masala
- 300 g ripe tomatoes, blended or finely grated
- 150 g green bell pepper (hoho), diced
- 200 ml water
- 180 g wholemeal (atta) wheat flour
- 110 ml warm water (for chapati dough)
- 4 g (0.75 teaspoon) salt, divided
- 15 g fresh coriander (dhania), chopped

**Method**

1. For the chapatis, mix the wholemeal flour and a pinch of salt in a bowl. Gradually add 110 ml warm water and knead for 5 minutes into a soft, pliable dough. Cover and rest for 15 minutes.
2. Heat 15 ml (1 tablespoon) oil in a pan over medium heat. Add the onion and sauté for 5 minutes until golden.
3. Add the ginger-garlic paste, curry powder, and garam masala, stirring for 1 minute.
4. Add the chicken pieces and sear for 4 minutes until lightly browned on the outside.
5. Pour in the grated tomatoes, chickpeas, water, and remaining salt. Cover and simmer gently for 15 minutes until the chicken is cooked through and tender. Stir in the diced green pepper for the final 3 minutes so it stays crisp.
6. Divide the rested chapati dough into 4 equal balls, roll each into a thin circle, and cook on a hot dry tawa or skillet for 1–2 minutes per side, brushing lightly with the remaining 2 teaspoons of oil until golden spots appear. Serve one chapati with each portion of curry, topped with dhania.

**Per serving (estimate):** 470 kcal · 36 g protein · 12 g fibre

### 5. Omena & Peanut (Njugu) Stew with Wholegrain Ugali & Managu

Sun-dried silver cyprinid (omena) is one of Kenya's most affordable, nutrient-dense sources of complete protein, calcium, and omega-3 fatty acids. Simmering omena in a rich tomato and groundnut (njugu karanga) sauce alongside indigenous African nightshade (managu) and wholegrain ugali yields a deeply traditional, high-protein meal.

**Serves 4 · Prep 20 min · Cook 25 min**

**Ingredients**

- 140 g dried omena, sorted and rinsed thoroughly
- 15 ml (1 tablespoon) vegetable oil
- 150 g red onion, finely chopped
- 10 g (2 teaspoons) garlic, minced
- 300 g ripe tomatoes, finely chopped
- 40 g (about 2.5 tablespoons) unsweetened natural peanut butter or finely ground roasted peanuts
- 250 ml warm water
- 350 g fresh managu (African nightshade) leaves, washed and chopped
- 280 g wholegrain maize meal
- 900 ml water (for ugali)
- 3 g (0.5 teaspoon) salt, or to taste

**Method**

1. Place the rinsed omena in a bowl, cover with hot water for 5 minutes to clean and soften slightly, then drain and pat dry with kitchen paper.
2. Heat the oil in a frying pan over medium-high heat. Fry the omena for 4–5 minutes until crisp and lightly golden, then remove onto a plate.
3. In the same pan, sauté the chopped onion for 4 minutes until soft, then add the garlic and tomatoes. Cook for 6 minutes until the tomatoes form a smooth base.
4. Whisk the peanut butter with 250 ml warm water until smooth, then pour it into the tomato mixture. Return the fried omena to the pan, season lightly with salt, and simmer uncovered for 8 minutes until thick and glossy.
5. Meanwhile, boil the chopped managu in a small amount of water for 6–8 minutes until tender, drain any excess bitter liquid, and season with a pinch of salt.
6. Boil 900 ml water in a sufuria, gradually stir in the wholegrain maize meal, and cook over low heat for 10 minutes until firm. Serve portions of ugali with the omena peanut stew and managu.

**Per serving (estimate):** 520 kcal · 33 g protein · 9 g fibre

### 6. Spiced Kamande (Brown Lentil) & Beef Mince Bowl

Blending lean minced beef with whole brown lentils (kamande) cuts saturated fat and cost while boosting dietary fibre. Served over wholegrain brown rice with crunchy cucumber and carrot ribbons, this bowl offers rich savoury flavour and lasting fullness.

**Serves 4 · Prep 15 min · Cook 30 min**

**Ingredients**

- 300 g extra-lean minced beef (5–10% fat)
- 160 g dried brown lentils (kamande), rinsed (or 400 g cooked)
- 160 g uncooked brown rice, rinsed
- 10 ml (2 teaspoons) olive or sunflower oil
- 150 g red onion, finely diced
- 10 g (2 teaspoons) garlic, minced
- 10 g (2 teaspoons) fresh ginger, grated
- 2 teaspoons smoked paprika
- 1 teaspoon ground cumin
- 300 g ripe tomatoes, diced
- 300 ml low-salt beef or vegetable stock
- 150 g carrots, peeled into ribbons or grated
- 150 g cucumber, sliced into half-moons
- 3 g (0.5 teaspoon) salt, or to taste
- 15 g fresh coriander (dhania), chopped

**Method**

1. Cook the rinsed brown rice in 400 ml water with a pinch of salt over low heat for 35 minutes until tender.
2. Meanwhile, simmer the rinsed dried kamande in plenty of water for 20–25 minutes until tender, then drain.
3. Heat the oil in a large pan over medium-high heat. Add the minced beef, breaking it up with a wooden spoon, and brown for 5–6 minutes. Drain any excess fat if present.
4. Add the diced onion, garlic, ginger, smoked paprika, and cumin to the beef, cooking for 4 minutes until the onion softens.
5. Stir in the tomatoes, cooked kamande, stock, and salt. Simmer uncovered for 10–12 minutes until thickened and rich.
6. Divide the brown rice among four bowls, spoon the beef and kamande mixture on top, and arrange the fresh carrot and cucumber slices alongside. Finish with fresh dhania.

**Per serving (estimate):** 475 kcal · 31 g protein · 9 g fibre

### 7. Masala Egg & Red Kidney Bean Shakshuka with Wholegrain Toast

Eggs poached directly in a spiced tomato, bell pepper, and red kidney bean sauce make a fast, budget-friendly meal suitable for breakfast, lunch, or dinner. The combination of egg protein, bean fibre, and wholegrain bread provides steady energy and helps prevent mid-morning or late-night snacking.

**Serves 2 · Prep 10 min · Cook 20 min**

**Ingredients**

- 4 large eggs
- 240 g cooked red kidney beans (drained and rinsed)
- 10 ml (2 teaspoons) olive or vegetable oil
- 120 g red onion, thinly sliced
- 100 g red or green bell pepper (hoho), diced
- 10 g (2 teaspoons) garlic, minced
- 1 teaspoon ground cumin
- 1 teaspoon paprika
- 0.25 teaspoon chilli flakes (optional)
- 350 g ripe tomatoes, finely chopped
- 60 g baby spinach leaves
- 2 slices (about 80 g total) 100% wholegrain or seeded bread, toasted
- 2 g (0.3 teaspoon) salt, or to taste
- 10 g fresh coriander (dhania), chopped

**Method**

1. Heat the oil in a wide, lidded frying pan over medium heat. Sauté the sliced onion and diced bell pepper for 5 minutes until softened.
2. Stir in the garlic, cumin, paprika, and chilli flakes, cooking for 1 minute until fragrant.
3. Add the chopped tomatoes, cooked kidney beans, and salt. Simmer uncovered for 8–10 minutes until the tomatoes form a thick, bubbling sauce. Stir in the baby spinach until wilted.
4. Using the back of a spoon, make 4 shallow wells in the sauce. Crack one egg into each well.
5. Cover the pan with a lid and cook gently over low-medium heat for 5–7 minutes, until the egg whites are completely set and the yolks reach your preferred firmness.
6. Scatter with fresh dhania and serve straight from the pan with one slice of wholegrain toast per person.

**Per serving (estimate):** 525 kcal · 32 g protein · 15 g fibre

### Practical meal-preparation and food-storage tips

- **Batch-cook legumes in advance:** Dried ndengu, kidney beans, kamande, and maize take time to boil. Cooking a large batch on the weekend and freezing portioned bags saves energy and cuts weeknight cooking time down to 20 minutes.
- **Cool and refrigerate promptly:** Allow cooked grains, stews, and meats to cool slightly at room temperature (for no more than two hours) before transferring them into clean, airtight containers in the refrigerator. Eat refrigerated leftovers within 3 to 4 days, and reheat until piping hot throughout.
- **Pre-wash and chop greens safely:** Wash sukuma wiki, managu, and spinach thoroughly in clean running water, shake dry, and store wrapped in clean paper towels inside an airtight container in the fridge for up to 3 days.
- **Portion starchy staples visually:** Use the "plate method"—fill half your plate with non-starchy vegetables (sukuma wiki, cabbage, kachumbari), a quarter with lean protein (fish, chicken, eggs, beans), and a quarter with wholegrain starch (brown ugali, brown rice, wholemeal chapati)—to keep portions consistent without weighing every meal.

### Frequently asked questions

**How much protein and fibre do adults generally need each day?**
General guidance from the World Health Organization and national health agencies such as the NHS suggests most adults need around 0.8 g of protein per kilogram of body weight daily (roughly 45–60 g per day depending on body size, though slightly higher intakes of around 1.0–1.2 g/kg may help preserve muscle during weight loss) and at least 25–30 g of dietary fibre per day. Spreading protein and fibre evenly across main meals helps control appetite more effectively than eating most of it at dinner.

**Can I lose weight eating ugali, rice, or chapati?**
Yes. Wholegrain carbohydrates do not cause weight gain on their own; total calorie intake over time is what matters. Choosing wholegrain versions (such as whole-maize or wimbi ugali, brown rice, and wholemeal atta chapati) adds extra fibre and nutrients, and pairing sensible portions with generous amounts of vegetables and protein slows down digestion.

**Are plant proteins like beans and ndengu as effective as meat for weight management?**
Yes. Legumes such as ndengu, beans, chickpeas, and kamande offer a unique advantage because they deliver both protein and substantial dietary fibre in the same food, while remaining very affordable in Kenya. Combining legumes with whole grains across the day easily meets essential amino acid needs.

**Will eating more fibre cause bloating at first?**
Increasing fibre too rapidly can cause temporary gas or bloating as gut bacteria adjust. Increase your intake gradually over two to three weeks, chew food thoroughly, and drink plenty of plain water throughout the day to help fibre move smoothly through your digestive tract.

**Should I use protein powders or fibre supplements instead of whole foods?**
For most healthy adults, whole foods are preferable because they provide vitamins, minerals, phytochemicals, and natural satiety signals that supplements lack. If you have a medical condition such as kidney disease, diabetes, or digestive disorders, consult a qualified doctor or registered dietitian before making major dietary changes or using supplements.

### Conclusion

Lasting weight management works best when healthy meals are familiar, satisfying, and realistic for your household budget. By pairing everyday Kenyan staples—from ndengu, beans, and omena to tilapia, eggs, and leafy greens—with sensible portions of whole grains, you can nourish your body, stay comfortably full between meals, and build sustainable habits for long-term health.

*This article is general information, not medical advice. If you have a health condition, talk to a doctor or registered dietitian before changing your diet.*`,
    sources: [
      { name: "WHO — Healthy diet", url: "https://www.who.int/news-room/fact-sheets/detail/healthy-diet" },
      { name: "NHS — How to get more fibre into your diet", url: "https://www.nhs.uk/live-well/eat-well/digestive-health/how-to-get-more-fibre-into-your-diet/" },
      { name: "NHS Better Health — Lose weight", url: "https://www.nhs.uk/better-health/lose-weight/" },
      { name: "Harvard Nutrition Source — Protein", url: "https://nutritionsource.hsph.harvard.edu/what-should-you-eat/protein/" },
      { name: "Harvard Nutrition Source — Fiber", url: "https://nutritionsource.hsph.harvard.edu/carbohydrates/fiber/" },
      { name: "USDA FoodData Central", url: "https://fdc.nal.usda.gov/" }
    ]
  },

  {
    title: "How to Apply for a Kenyan Passport in 2026: Fees, Requirements and Step-by-Step Guide",
    category: "Travel",
    slug: "kenyan-passport-application-guide-2026",
    seoTitle: "How to Apply for a Kenyan Passport in 2026: Fees & Steps",
    description: "Kenyan passport requirements, fees, eCitizen application steps, biometric capture at an immigration centre and collection, explained for 2026.",
    date: "2026-11-23",
    format: "markdown",
    image: "https://images.unsplash.com/photo-1577345848762-8b7cab61de4d?auto=format&fit=crop&w=1600&q=75",
    caption: "A Kenyan East African Community ePassport. Photo: Clement Mwaura / Unsplash.",
    summary: "Applying for a Kenyan passport is largely an online process, but applicants must attend an immigration centre in person for document verification and biometric capture. This guide explains the requirements, fees, eCitizen procedure and passport collection in 2026.",
    body: `Whether you are preparing for an overseas holiday, university studies, employment abroad or a family visit, a valid passport is an essential travel document.

The Kenyan government issues electronic passports, commonly called ePassports, containing biometric information to support identity verification and international travel. These passports are generally valid for ten years. Applications begin on the government's eCitizen platform and are completed with an in-person appointment at an authorised passport processing centre.

### 1. How much does a Kenyan passport cost in 2026?

The Directorate of Immigration Services' published fee schedule is:

| Passport type | Pages | Official fee |
| --- | --- | --- |
| Ordinary A Series | 34 | KSh 7,550 |
| Ordinary B Series | 50 | KSh 9,550 |
| Ordinary C Series | 66 | KSh 12,050 |
| Diplomatic passport | 50 | KSh 15,050 |
| Lost or mutilated passport replacement | — | KSh 20,050 |

**Important:** the official fee schedule does not guarantee that every booklet is available on eCitizen. In February 2026, news reports said the portal was offering first-time applicants only the 66-page C Series, listed at KSh 12,500, after the 34-page booklet was withdrawn in 2025. The government described the unavailability of the smaller booklets as temporary. Check which booklets are available, and the final amount payable, on eCitizen before you pay.

### 2. Documents required for a Kenyan passport

Before starting your application, gather your identification documents and make sure your personal details match across all of them.

For a first-time adult application, you should generally prepare:

- Your original Kenyan national identity card and a copy
- Your original birth certificate and a copy
- Your parents' identification documents or other evidence of citizenship, where required
- Any additional documents requested for your particular application
- Printed application forms and payment confirmation after completing the online process

**Children under 18:** the application generally requires the child's birth certificate, the parent's or legal guardian's identification, and the applicable parental or guardian consent. A parent or legally recognised guardian must accompany the child to the appointment. Someone acting in place of a biological parent must have legal guardianship.

**Replacements:** if you are replacing an expired, lost or damaged passport, choose the correct replacement category. You may need extra documents, such as your previous passport, a police abstract or a sworn affidavit, depending on your circumstances.

Always follow the exact document checklist shown on eCitizen for your application category.

### 3. Step-by-step guide to applying online

1. **Visit the eCitizen website.** Go to the [Directorate of Immigration's eCitizen portal](https://dis.ecitizen.go.ke/). Sign in with your existing account, or register if you are a new user.
2. **Start your passport application.** Choose the passport service and say whether you are applying for the first time or replacing a passport. Enter your details carefully.
3. **Submit your application and pay.** Upload the requested supporting documents and follow the payment instructions in the portal. Save the confirmation and download your application documents.
4. **Book an appointment.** Choose an available date and an authorised passport processing centre through eCitizen. Keep a record of your appointment.
5. **Attend biometric capture.** Visit the centre in person with your original documents, copies and application printouts. Immigration officers will verify your documents and capture your photograph and biometric details.

### 4. Where can you apply?

Passport applications are handled at Nyayo House in Nairobi and at regional immigration offices, including Mombasa, Kisumu, Nakuru, Eldoret, Embu and Kisii. The government has announced plans to open more centres, so the list of stations can change. When booking, choose from the centres eCitizen offers, and confirm the exact address on your appointment.

### 5. How long does passport processing take?

The Directorate's 2025 Service Delivery Charter sets a target of 14 working days for passport issuance.

Actual processing may take longer, depending on document verification, application volumes and booklet availability. Avoid making non-refundable travel arrangements based only on this target.

### 6. How to track and collect your passport

After your biometric appointment, you can check your application's progress by signing in to your eCitizen account.

You can also track it by SMS: send the application number shown on your receipt to **22222**. Don't send your ID number, as the service only recognises the eCitizen application number.

When your passport is ready, you should receive a notification. Collect it from the processing centre where your biometrics were captured. Bring your payment invoice and your original national ID (or the original birth certificate for a child). Replacement applicants should also bring their previous passport where applicable.

### 7. Common mistakes to avoid

- **Mismatched details:** make sure your name and date of birth match on your national ID and birth certificate. If they don't, correct them with the relevant registration authority before applying.
- **Missed appointments:** missing your biometric appointment will delay your application.
- **Incomplete documents:** bring every original and copy on the checklist.
- **Paying middlemen:** avoid unauthorised agents who promise guaranteed fast-track services.
- **Children's applications:** confirm that the correct parent or legal guardian will attend, and that consent documents are complete.

### 8. Applying for a passport while living abroad

Kenyan citizens living outside the country can get passport services through Kenyan embassies, high commissions and consulates. Application, appointment and collection procedures vary between missions, so contact your nearest Kenyan mission for its current instructions before making travel plans.

### 9. Frequently asked questions

**Can I apply without visiting an immigration office?**
No. The application starts online, but you must attend an appointment for biometric capture and document verification.

**Can I apply for a passport for my child?**
Yes. A parent or legally recognised guardian can apply on behalf of an eligible Kenyan child, subject to the identification and consent requirements.

**Do I need a recommender's ID?**
No. The Directorate's FAQ says a recommender's ID copy is no longer required, and the recommending officer section of the form is now optional. Some embassy pages abroad may still list it, so check with your mission if you are applying overseas.

**Can I collect my passport from a different centre?**
No. Passports are collected from the centre where biometric enrolment took place.

**What happens if I lose my passport?**
You must apply for a replacement and provide the supporting documents required for lost passports. The published replacement fee is KSh 20,050.

### Conclusion

Applying for a Kenyan passport in 2026 starts with an eCitizen account, accurate identification details, payment of the correct fee and a biometric appointment. Preparing your documents in advance, checking which booklets are available and following the official process will help you avoid unnecessary delays.

*Government fees, booklet availability and processing arrangements can change. Always confirm the latest details with the Directorate of Immigration Services or on eCitizen before applying.*`,
    sources: [
      { name: "Directorate of Immigration Services — Type and Fees", url: "https://immigration.go.ke/type-and-fees/" },
      { name: "Directorate of Immigration — Service Delivery Charter 2025", url: "https://immigration.go.ke/wp-content/uploads/2025/07/DIRECTORATE-OF-IMMIGRATION-SERVICE-DELIVERY-CHARTER-2025.pdf" },
      { name: "Directorate of Immigration — FAQs", url: "https://immigration.go.ke/faqs/" },
      { name: "eCitizen — Directorate of Immigration", url: "https://dis.ecitizen.go.ke/" },
      { name: "The Kenya Times — 66-page booklet only option on eCitizen", url: "https://thekenyatimes.com/lifestyle/immigration/kenyans-forced-to-pay-ksh-12500-passport-fee-after-govt-disables-50-page-booklet-option/" },
      { name: "People Daily — Government responds on missing passport options", url: "https://peopledaily.digital/news/govt-responds-after-abrupt-disappearance-of-cheaper-passport-option-from-ecitizen" },
      { name: "Kenyans.co.ke — Recommending officer now optional", url: "https://www.kenyans.co.ke/news/125415-immigration-revises-passport-application-rules-makes-recommending-officer-optional" }
    ]
  },

  {
    title: "Opposition Quits IEBC Talks, Saying 2027 Reform Concerns Were Ignored",
    category: "Politics",
    slug: "opposition-quits-iebc-talks-2027-reforms",
    seoTitle: "Opposition Walks Out of IEBC Talks Over 2027 Reforms",
    description: "Rigathi Gachagua and other opposition figures left an IEBC consultative session, saying their concerns were left off the agenda. President Ruto hit back.",
    date: "2026-11-19",
    image: "https://images.unsplash.com/photo-1675855549790-20aabcde8db2?auto=format&fit=crop&w=1600&q=75",
    caption: "Illustrative image: the flag of Kenya. Photo: engin akyurt / Unsplash.",
    summary: "Rigathi Gachagua and other opposition figures left a consultative session with the electoral commission, complaining that the issues they wanted discussed had been left off the programme. President William Ruto hit back hours later.",
    body: `A consultative session between the electoral commission and Kenya's political parties ended in disarray in Nairobi on Thursday, November 19, when opposition leaders got up and left, saying the programme ignored the reforms they want before next year's vote.

Former Deputy President Rigathi Gachagua, who now heads the DCP, led the exit. Wiper leader Kalonzo Musyoka was among those who left with him. Supporters outside greeted them with chants of "One Term", a jab at President William Ruto's bid for a second term.

Addressing the commission before the exit, Gachagua said the opposition had paid the IEBC a courtesy call in late January, where the two sides agreed to form technical teams. Since then, he said, two letters from the opposition, sent in February and May, had gone unanswered, and Thursday's session was the first time the commission had invited them back.

He told the commissioners that the published programme did not reflect the concerns Kenyans had raised, and that talks without those issues would serve no purpose.

As a way forward, the opposition has named a reform team headed by former Chief Justice David Maraga. Gachagua proposed that this team work out a joint agenda with the commission before the parties meet again.

President Ruto dismissed the protest within hours. Addressing residents in Webuye West, Bungoma County, he argued that the commission only counts the ballots and that voters, not the IEBC, decide who wins. He urged the opposition to "stop disturbing the IEBC" and focus instead on picking a presidential candidate, saying his camp was ready for whoever they field.

Kenyans go to the polls on Tuesday, August 10, 2027.`,
    sources: [
      { name: "Citizen Digital — Opposition leaders walk out of IEBC meeting", url: "https://citizen.digital/article/drama-as-opposition-leaders-walk-out-of-iebc-meeting-cite-exclusion-of-key-issues-n394201" },
      { name: "Citizen Digital — Ruto slams opposition over walkout", url: "https://citizen.digital/article/wacheni-kusumbua-iebc-haipigi-kura-ruto-slams-opposition-over-dramatic-walkout-n394205" },
      { name: "The Standard — Kalonzo and Gachagua storm out of IEBC talks", url: "https://www.standardmedia.co.ke/politics/article/2001562639/kalonzo-and-gachagua-storm-out-of-iebc-talks-over-poll-preparedness" }
    ]
  },

  {
    title: "Nine Killed in Two Nairobi Construction Collapses in Two Days",
    category: "Nairobi",
    slug: "nairobi-building-collapses-nine-killed",
    seoTitle: "Nine Killed in Two Nairobi Construction Collapses",
    description: "An unfinished eight-storey block near the SGR terminus collapsed, killing six. A day later a wall at a Riverside site fell, killing at least three.",
    date: "2026-11-14",
    image: "https://images.unsplash.com/photo-1741916541913-7203d2be5e6e?auto=format&fit=crop&w=1600&q=75",
    caption: "Illustrative image: a building under construction with scaffolding, not either of the Nairobi sites. Photo: Salvador Rios / Unsplash.",
    summary: "An unfinished eight-storey block near the SGR terminus came down on Friday, killing six. Less than a day later, a wall at a Riverside excavation site fell on workers, killing at least three.",
    body: `Two accidents at Nairobi building sites on back-to-back days have left nine people dead and raised fresh questions about how construction work in the city is supervised.

The first happened shortly before 10am on Friday, November 13, on Mombasa Road close to the SGR terminus. An unfinished eight-storey block gave way after its uppermost floor slab failed, county rescuers said in their initial assessment, burying people who were working on the site.

County firefighters and specialist rescue crews dug through the wreckage. Five workers were brought out alive and sent to hospital. Six bodies were recovered.

The second accident came the next morning, Saturday, November 14, at around 11.30am in Riverside. There, a boundary wall at a site where foundations were still being dug fell onto workers. Three people died and eleven were hospitalised with serious injuries. Fourteen others escaped unhurt.

According to Bramwell Simiyu, who heads disaster management for Nairobi County, 39 people were working at the Riverside site that morning, and rescuers were still trying to trace everyone on the workers' list when he gave his update. No upper floors had yet been built there.

He said county planning officials would join the National Construction Authority (NCA) in auditing the Riverside project, checking both its structure and whether it met the rules, once the rescue work was over.

The casualty figures above are those given by officials at the time of each incident.`,
    sources: [
      { name: "Citizen Digital — Six killed as building collapses on Mombasa Road", url: "https://citizen.digital/article/six-killed-as-building-under-construction-collapses-on-mombasa-road-n393851" },
      { name: "The Standard — Perimeter wall collapses in Riverside", url: "https://standardmedia.co.ke/nairobi/article/2001562263/deaths-and-destruction-as-perimeter-wall-collapses-in-riverside" }
    ]
  }
];
