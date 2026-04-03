#!/usr/bin/env tsx
/**
 * Ingestion script for UK Farm Planning MCP.
 *
 * Seeds the database from hardcoded data. Future versions will
 * fetch from AHDB, HMRC, and legislation.gov.uk APIs.
 *
 * Usage:
 *   npm run ingest
 *   npm run ingest:fetch  (--fetch-only: download sources without rebuilding)
 */

import { createDatabase } from '../src/db.js';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');
const dbPath = join(DATA_DIR, 'database.db');

console.log('Ingesting UK farm planning data...');
console.log(`Database: ${dbPath}`);

const db = createDatabase(dbPath);

// Clear existing data
db.run('DELETE FROM rotation_guidance');
db.run('DELETE FROM gross_margins');
db.run('DELETE FROM tax_rules');
db.run('DELETE FROM apr_guidance');
db.run('DELETE FROM tenancy_rules');
db.run('DELETE FROM diversification');
db.run('DELETE FROM search_index');

// ── Rotation Guidance ───────────────────────────────────────────────

const rotations: [string, string | null, string, string, number | null, string | null, number, string][] = [
  ['winter wheat', 'oilseed rape', 'good', 'Break crop benefit, different disease spectrum, typically +5-10% yield vs second wheat', null, 'medium', 7.5, 'AHDB rotation guidance'],
  ['oilseed rape', 'winter wheat', 'good', 'OSR is a good entry for first wheat, standard UK rotation', null, 'medium', 0, 'AHDB rotation guidance'],
  ['winter wheat', 'winter wheat', 'acceptable', 'Second wheat: 10-15% yield penalty, take-all risk increases, blackgrass pressure builds', null, 'high', -12.5, 'AHDB rotation guidance'],
  ['winter wheat', 'winter wheat continuous', 'poor', 'Continuous wheat: take-all builds year on year, blackgrass risk very high, -20% yield typical', null, 'very high', -20, 'AHDB rotation guidance'],
  ['winter wheat', 'beans', 'good', 'Beans fix nitrogen (reducing N fertiliser need by 30-50 kg/ha for following crop), provide disease break from cereal pathogens', null, 'low', 5, 'AHDB rotation guidance'],
  ['beans', 'winter wheat', 'good', 'N fixation benefit reduces fertiliser need for following wheat by up to 50 kg N/ha', null, 'low', 7, 'AHDB rotation guidance'],
  ['winter barley', 'winter wheat', 'good', 'Early harvest gives good establishment window for following wheat, different disease break', null, 'medium', 0, 'AHDB rotation guidance'],
  ['spring barley', 'winter wheat', 'good', 'Spring cropping breaks blackgrass germination cycle effectively — most effective blackgrass control in rotation', null, 'low', 0, 'AHDB rotation guidance'],
  ['oilseed rape', 'oilseed rape', 'avoid', 'Minimum 4-year break between OSR crops required — clubroot inoculum persists in soil, sclerotinia risk high', 4, 'medium', -30, 'AHDB rotation guidance'],
  ['sugar beet', 'winter wheat', 'good', 'Deep rooting crop, uses different herbicide groups, provides good break for cereal diseases', null, 'low', 0, 'AHDB rotation guidance'],
  ['potatoes', 'winter wheat', 'good', 'Good break but requires minimum 5-year rotation for Potato Cyst Nematode (PCN) and blight management', 5, 'low', 0, 'AHDB rotation guidance'],
  ['linseed', 'winter wheat', 'good', 'Good break crop, low input requirement, suits lighter soils, provides cereal disease break', null, 'low', 0, 'AHDB rotation guidance'],
  ['maize', 'winter wheat', 'good', 'No disease interaction with cereals, good for livestock farms, but late harvest can damage soil structure', null, 'low', 0, 'AHDB rotation guidance'],
  ['winter wheat', 'spring barley', 'good', 'Spring cropping opportunity, breaks autumn-germinating grass weed cycle', null, 'low', 0, 'AHDB rotation guidance'],
  ['oilseed rape', 'winter barley', 'good', 'Good entry for winter barley, utilises residual N from OSR', null, 'medium', 0, 'AHDB rotation guidance'],
  ['winter wheat', 'sugar beet', 'good', 'Good rotation break, different pest and disease spectrum', null, 'low', 0, 'AHDB rotation guidance'],
  ['potatoes', 'potatoes', 'avoid', 'PCN builds rapidly with short rotations — minimum 5-year break required, ideally 7 years', 5, 'low', -25, 'AHDB rotation guidance'],
  ['winter wheat', 'linseed', 'good', 'Linseed provides cereal break, low input crop, suits lighter soils', null, 'low', 0, 'AHDB rotation guidance'],
  ['winter wheat', 'potatoes', 'good', 'Good entry for potatoes if rotation allows — wheat stubble easy to prepare', 5, 'low', 0, 'AHDB rotation guidance'],
  ['winter wheat', 'maize', 'acceptable', 'Maize after wheat is common on livestock farms but late harvest risks soil compaction', null, 'low', 0, 'AHDB rotation guidance'],

  // ── New rotation guidance ─────────────────────────────────────────────
  ['maize', 'grass ley', 'good', 'Maize after grass benefits from ley N fixation; grass ley builds soil organic matter and structure before maize', null, 'low', 5, 'AHDB rotation guidance'],
  ['maize', 'maize', 'acceptable', 'Continuous maize acceptable for 2-3 years but compaction risk increases with each year; monitor soil structure and consider break crop', null, 'low', -5, 'AHDB rotation guidance'],
  ['grass ley', 'winter wheat', 'excellent', '2-3 year ley rebuilds organic matter, improves soil structure and biology; first wheat after ley typically yields well', null, 'low', 10, 'AHDB rotation guidance'],
  ['winter rye', 'winter wheat', 'good', 'Competitive against blackgrass due to early vigorous growth; early harvest in July provides good entry for following crop', null, 'low', 0, 'AHDB rotation guidance'],
  ['peas', 'winter wheat', 'good', 'Peas fix atmospheric nitrogen at 50-80 kg N/ha, reducing fertiliser need for following wheat; different disease spectrum from cereals', null, 'low', 7, 'AHDB rotation guidance'],
  ['hemp', 'winter wheat', 'good', 'Good break crop with deep root system; requires Home Office licence for cultivation; suppresses weeds through rapid canopy closure', null, 'low', 0, 'AHDB rotation guidance / Home Office licensing'],
  ['herbal ley', 'winter wheat', 'good', 'SFI option SW7; 5+ species mix including legumes, herbs, and grasses; builds soil health and supports pollinators; minimum 2-year ley', null, 'low', 8, 'SFI guidance / AHDB'],
  ['cover crop', 'spring crop', 'good', 'Sow cover crop Aug-Sep after harvest, destroy by Feb before spring drilling; prevents nutrient leaching and builds soil biology', null, 'low', 3, 'AHDB cover crop guidance'],
  ['spring crop', 'winter wheat', 'good', 'Spring cropping (spring barley, spring oats, spring beans) essential for blackgrass management; delayed drilling late Oct for winter crops as alternative', null, 'low', 0, 'AHDB blackgrass management guide'],
];

for (const [crop, following, suit, reason, diseaseBreak, bgRisk, yieldImpact, source] of rotations) {
  db.run(
    `INSERT INTO rotation_guidance (crop, following_crop, suitability, reason, disease_break_years, blackgrass_risk, yield_impact_pct, source, jurisdiction)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'GB')`,
    [crop, following, suit, reason, diseaseBreak, bgRisk, yieldImpact, source]
  );
}

// ── Gross Margins ───────────────────────────────────────────────────

const margins: [string, string, number, number, number, string, number, number, string][] = [
  ['Winter wheat', '2024/25', 1530, 650, 880, 'per_ha', 1100, 600, 'AHDB Farmbench 2024/25'],
  ['Winter barley', '2024/25', 1250, 580, 670, 'per_ha', 850, 450, 'AHDB Farmbench 2024/25'],
  ['Spring barley', '2024/25', 1100, 500, 600, 'per_ha', 800, 380, 'AHDB Farmbench 2024/25'],
  ['Oilseed rape', '2024/25', 1200, 550, 650, 'per_ha', 900, 350, 'AHDB Farmbench 2024/25'],
  ['Winter beans', '2024/25', 900, 350, 550, 'per_ha', 700, 350, 'AHDB Farmbench 2024/25'],
  ['Sugar beet', '2024/25', 2200, 900, 1300, 'per_ha', 1600, 900, 'AHDB Farmbench 2024/25'],
  ['Potatoes (maincrop)', '2024/25', 5500, 3200, 2300, 'per_ha', 3500, 800, 'AHDB Farmbench 2024/25'],
  ['Dairy cow', '2024/25', 2800, 1900, 900, 'per_head', 1300, 400, 'AHDB Pocketbook 2024/25'],
  ['Beef finisher', '2024/25', 1600, 1200, 400, 'per_head', 600, 100, 'AHDB Pocketbook 2024/25'],
  ['Lowland ewe', '2024/25', 145, 65, 80, 'per_head', 120, 30, 'AHDB Pocketbook 2024/25'],
  ['Upland ewe', '2024/25', 110, 50, 60, 'per_head', 90, 20, 'AHDB Pocketbook 2024/25'],
  ['Broilers (per 1000)', '2024/25', 9500, 8200, 1300, 'per_1000_birds', 1800, 600, 'AHDB Pocketbook 2024/25'],
  ['Free-range eggs (per bird)', '2024/25', 24, 18, 6, 'per_bird', 9, 2, 'AHDB Pocketbook 2024/25'],
  ['Linseed', '2024/25', 800, 380, 420, 'per_ha', 550, 250, 'AHDB Farmbench 2024/25'],
  ['Maize (silage)', '2024/25', 1400, 700, 700, 'per_ha', 900, 450, 'AHDB Pocketbook 2024/25'],

  // ── New gross margin enterprises ──────────────────────────────────────
  ['Spring oats', '2024/25', 950, 420, 530, 'per_ha', 700, 300, 'AHDB Farmbench 2024/25'],
  ['Upland suckler cow', '2024/25', 800, 400, 400, 'per_head', 600, 150, 'AHDB Pocketbook 2024/25'],
  ['Pig finishing', '2024/25', 110, 95, 15, 'per_pig', 30, -10, 'AHDB Pocketbook 2024/25'],
  ['Sow breeding herd', '2024/25', 2800, 2400, 400, 'per_sow_per_year', 700, 50, 'AHDB Pocketbook 2024/25'],
  ['Milk (per litre)', '2024/25', 0.35, 0.25, 0.10, 'per_litre', 0.15, 0.03, 'AHDB Dairy Costings 2024/25'],
  ['Goats (dairy)', '2024/25', 600, 350, 250, 'per_head', 350, 100, 'Industry estimates 2024/25'],
  ['Strawberries', '2024/25', 40000, 25000, 15000, 'per_ha', 20000, 8000, 'AHDB Horticulture 2024/25'],
  ['Asparagus', '2024/25', 12000, 5000, 7000, 'per_ha', 9000, 4000, 'AHDB Horticulture 2024/25'],
  ['Peas (combining)', '2024/25', 850, 380, 470, 'per_ha', 600, 280, 'AHDB Farmbench 2024/25'],
  ['Hemp (fibre)', '2024/25', 900, 450, 450, 'per_ha', 600, 250, 'Industry estimates 2024/25'],
];

for (const [ent, year, output, vc, gm, unit, top, bottom, source] of margins) {
  db.run(
    `INSERT INTO gross_margins (enterprise, year, output_per_unit, variable_costs_per_unit, gross_margin_per_unit, unit, top_quartile, bottom_quartile, source, jurisdiction)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'GB')`,
    [ent, year, output, vc, gm, unit, top, bottom, source]
  );
}

// ── Tax Rules ───────────────────────────────────────────────────────

const taxRules: [string, string, string, string, string, string][] = [
  ['Making Tax Digital (Income Tax)', 'MTD for Income Tax Self Assessment mandatory from April 2026 for sole traders and landlords with income over £50,000. Quarterly updates via compatible software. Threshold drops to £30,000 from April 2027.', 'Gross income from self-employment or property exceeds threshold', 'Quarterly updates due by 5th of month following quarter end; final declaration by 31 January', 'Points-based penalty system: 1 point per late submission, £200 penalty at threshold (varies by submission frequency)', 'HMRC MTD-ITSA guidance'],
  ['Making Tax Digital (VAT)', 'MTD for VAT already mandatory for all VAT-registered businesses. Must keep digital records and submit returns via compatible software.', 'All VAT-registered businesses', 'Quarterly VAT returns', 'Default surcharge for late returns; interest on late payments', 'VAT Notice 700/22'],
  ['Farmers averaging', 'Farmers can average profits over 2 years (standard) or 5 years (from 2016/17 onwards). Claim must be made within first anniversary of the normal self-assessment filing date for the later tax year. Averaging smooths volatile farming income for income tax purposes.', 'Farming profits only (not mixed income). Must have at least 2 or 5 consecutive years of farming.', 'Claim within 12 months of 31 January filing deadline for later year', 'No specific penalty for not claiming — it is optional. Incorrect claims may incur interest.', 'ITTOIA 2005 ss 221-225 / HMRC BIM84000'],
  ['Capital allowances', 'Annual Investment Allowance (AIA) of £1,000,000 for qualifying plant and machinery. 100% first-year allowance on qualifying assets. Full expensing at 100% for main rate assets from April 2023 (companies only).', 'Must be used in the trade. Buildings do not qualify (use SBA instead). Cars have separate rules.', 'Claim in the tax year the expenditure is incurred', 'N/A', 'CAA 2001 / HMRC CA20000'],
  ['Structures and Buildings Allowance', 'SBA provides 3% per year straight-line relief over 33.33 years for qualifying new commercial structures and buildings, including farm buildings. Available from October 2018.', 'New construction or renovation of commercial buildings. Must have a valid allowance statement.', 'Relief claimed annually over 33.33 years from the date the building comes into use', 'N/A', 'HMRC CA90000'],
  ['Flat rate VAT scheme', 'Agricultural flat rate scheme: farmers can use a 4% flat rate addition on sales instead of standard VAT accounting. Alternatively, the general flat rate scheme rate for agriculture is 6.5%. Beneficial when input VAT is relatively low.', 'Must apply to HMRC. Cannot reclaim input VAT under flat rate.', 'Quarterly or annual returns as agreed with HMRC', 'Standard VAT penalties apply', 'VAT Notice 733 / VAT Notice 700/46'],
  ['Partnership tax', 'Each partner in a farming partnership files their own self-assessment return. Profit allocation follows the partnership agreement. Partnership itself files a partnership return (SA800).', 'Must have a valid partnership agreement. All partners must register for self-assessment.', 'Partnership return due 31 January following the end of the tax year', 'Late filing penalty £100 per partner; £10/day after 3 months; further penalties at 6 and 12 months', 'HMRC Partnership Manual PM100000'],
  ['Inheritance Tax (overview)', 'Standard IHT rate is 40% on estates above the nil rate band of £325,000 (frozen until at least April 2028). Residence nil rate band adds £175,000 for direct descendants. Agricultural Property Relief (APR) and Business Property Relief (BPR) can reduce or eliminate IHT on farming assets.', 'Applies to estates on death and certain lifetime transfers. APR/BPR are separate reliefs with own conditions.', 'IHT account (IHT400) due within 12 months of death. Tax due 6 months after end of month of death.', 'Interest on late payment. Penalties for incorrect returns.', 'IHTA 1984 / HMRC IHTM24000'],

  // ── New tax rules ─────────────────────────────────────────────────────
  ['Rollover relief (CGT)', 'Capital gains tax on disposal of qualifying business assets can be deferred (rolled over) when the proceeds are reinvested in new qualifying assets within 3 years of disposal (or 1 year before). The gain is deducted from the base cost of the replacement asset. Applies to land, buildings, fixed plant and machinery used in the farming trade.', 'Must reinvest in qualifying assets within the time limit. Both old and new assets must be used in the trade. Partial reinvestment gives partial relief.', 'Reinvestment within 1 year before to 3 years after disposal. Claim on self-assessment return.', 'No penalty for not claiming — it is optional. Late claims require HMRC agreement.', 'TCGA 1992 ss 152-159 / HMRC CG60250'],
  ['Herd basis accounting', 'Irrevocable election to treat a production herd (dairy cows, breeding ewes, breeding sows, etc.) as a capital asset rather than trading stock. Under herd basis, sales of herd animals are not taxable income if the herd is replaced. Only the initial cost of establishing the herd and any net increase in herd size is taxable. Election must be made within 2 years of first relevant accounting period.', 'Must be a production herd (animals kept for produce: milk, wool, eggs, breeding). Not applicable to animals held for slaughter. Irrevocable once made.', 'Election within 2 years of first relevant period of account', 'No penalty for not electing — election is optional but irrevocable', 'ITTOIA 2005 ss 111-129 / HMRC BIM55400'],
  ['SFI and CS payments (tax treatment)', 'Sustainable Farming Incentive (SFI) and Countryside Stewardship (CS) payments are taxable income, not capital receipts. They are treated as farming income for income tax purposes and must be included in profit calculations. They do not count as capital for CGT or IHT purposes.', 'All agri-environment scheme payments from RPA/NE are revenue receipts.', 'Included in annual profit and loss; declared on self-assessment return', 'Standard income tax penalties for failure to declare', 'HMRC BIM55100 / DEFRA scheme guidance'],
  ['Sporting rights income', 'Income from sporting rights (shooting, fishing, stalking) on farmland is taxable as property income or trading income depending on the arrangement. Granting sporting rights may affect APR eligibility if HMRC considers the land is no longer occupied for agricultural purposes. Landlords should structure sporting licences carefully.', 'If landowner actively manages the shoot, may be treated as a trade. Simple licence to shoot is property income.', 'Declared on annual self-assessment return', 'Standard income tax penalties for failure to declare', 'ITTOIA 2005 / HMRC PIM1100 / IHTM24012'],
  ['Employee and seasonal worker tax', 'Farmers employing workers must operate PAYE. Seasonal workers (employed for short periods) are subject to standard PAYE tax and NI deductions unless below the earnings threshold. Workers supplied through a gangmaster or agency may be subject to different rules (CIS or agency regulations). Off-payroll working rules (IR35) apply to contractors.', 'All employers must register for PAYE. RTI (Real Time Information) submissions required each pay period.', 'PAYE due monthly (or quarterly if small employer). P60 by 31 May. P11D by 6 July.', 'Late filing: £100 per 50 employees per month. Late payment: escalating penalties.', 'HMRC PAYE guidance / Employment Allowance / NMW enforcement'],
];

for (const [topic, rule, conditions, deadlines, penalties, ref] of taxRules) {
  db.run(
    `INSERT INTO tax_rules (topic, rule, conditions, deadlines, penalties, hmrc_ref, jurisdiction)
     VALUES (?, ?, ?, ?, ?, ?, 'GB')`,
    [topic, rule, conditions, deadlines, penalties, ref]
  );
}

// ── APR Guidance ────────────────────────────────────────────────────

const aprData: [string, number, string, string, string | null, string, string][] = [
  ['Owner-occupier farming own land', 1, '100% APR available. Land must have been occupied by the owner for agricultural purposes for at least 2 years before transfer.', '2-year occupation test: owner must occupy the property for agricultural purposes', null, 'HMRC IHTM24030: owner-occupier relief at 100% after 2 years occupation', 'IHTA 1984 s 116 / IHTM24030'],
  ['Tenanted land (post-1 Sep 1995)', 1, '100% APR available. Land let on a tenancy beginning on or after 1 September 1995 qualifies for 100% relief.', '7-year ownership test: owner must have owned the property for 7 years if not occupying it', null, 'Post-1995 tenancies qualify at 100% — ATA 1995 Farm Business Tenancies', 'IHTA 1984 s 116(2)(b) / IHTM24060'],
  ['Tenanted land (pre-1 Sep 1995)', 1, '50% APR only. Land let on a tenancy that began before 1 September 1995 (typically an AHA 1986 tenancy) qualifies for only 50% relief.', '7-year ownership test', null, '50% rate applies to pre-September 1995 AHA tenancies. Consider BPR top-up if landlord is actively farming.', 'IHTA 1984 s 116(2)(a) / IHTM24061'],
  ['Farmhouse', 1, 'APR available on the farmhouse if it is of a character appropriate to the agricultural property. HMRC applies a proportionality test — the farmhouse must not be disproportionately large relative to the farming operation.', 'Character appropriate test: HMRC compares the farmhouse to the farming operation size', null, 'If farmhouse is disproportionate (a mansion on a small farm), HMRC will restrict or deny APR. Lloyds TSB v IRC (2002) established character appropriate test.', 'IHTA 1984 s 115(2) / IHTM24050 / Lloyds TSB v IRC'],
  ['Farm cottages', 1, 'APR available on cottages occupied by farm workers for agricultural purposes.', 'Must be occupied by a person employed in farming the property', null, 'Worker must be employed in agriculture on the property, not unrelated activities.', 'IHTA 1984 s 115(2) / IHTM24054'],
  ['Land in hand (not farmed)', 0, 'NO APR if owner simply holds agricultural land without farming it or letting it for agriculture. APR requires either occupation for agriculture by owner, or letting for agricultural purposes.', 'Must satisfy either owner-occupier test or letting test', null, 'Simply owning agricultural land is not sufficient. Land must be in agricultural use.', 'IHTA 1984 s 117 / IHTM24000'],
  ['Clawback on sale/change of use', 1, 'If property receiving APR is sold or its use changes within 7 years of the transfer (death or lifetime gift), HMRC can claw back the relief.', '7-year clawback period from date of death or transfer', '7 years', 'Applies to both death and lifetime transfers. New owner must maintain agricultural occupation.', 'IHTA 1984 s 124A / IHTM24200'],
  ['Trusts holding farmland', 1, 'APR available to trusts if a beneficiary occupies the land for agricultural purposes, or if the trust lets the land for agriculture.', 'Beneficiary must occupy for agriculture OR land must be let for agriculture', null, 'Relevant for farm succession planning. Discretionary trusts can qualify.', 'IHTA 1984 s 115-124C / IHTM24070'],
  ['Company-owned farms', 1, 'APR applies to shares in a farming company if the land owned by the company is of a character appropriate to agricultural property. BPR may also apply.', 'Character appropriate test applies to the underlying property', null, 'Relief attaches to the shares, not the land directly. Both APR and BPR claims possible.', 'IHTA 1984 s 122 / IHTM24100'],
  ['Diversified-use land', 0, 'NO APR on the portion of land used for non-agricultural purposes: farm shop buildings, holiday lets, solar panel installations, equestrian use (non-agricultural). Only the agricultural portion qualifies.', 'APR applies only to agricultural property — non-agricultural use disqualifies that portion', null, 'Common trap: diversification income is good for cash flow but can reduce IHT relief. Careful apportionment needed between agricultural and non-agricultural value.', 'IHTA 1984 s 115(2) / IHTM24012'],

  // ── New APR guidance ──────────────────────────────────────────────────
  ['Solar farms on agricultural land', 0, 'NO APR on land under solar panels. Solar panels are not agricultural use. The land ceases to qualify for APR for the duration of the solar installation. Consider BPR instead if the solar farm is a qualifying trade.', 'Land must be occupied for agricultural purposes — solar generation is not agriculture', null, 'Solar lease income may be attractive but removes APR from that land. Agrivoltaics (grazing under elevated panels) is untested for APR.', 'IHTA 1984 s 115(2) / HMRC IHTM24012'],
  ['SFI and CS agreement land', 1, 'APR retained on land under SFI or Countryside Stewardship agreements. HMRC treats agri-environmental management as agricultural occupation for APR purposes.', 'Land must be managed under a valid SFI/CS/ELS/HLS agreement', null, 'Agri-environment schemes are treated as agricultural use — HMRC published guidance confirming this position.', 'IHTA 1984 s 115(2) / HMRC IHTM24032'],
  ['Short-term grazing licence (364-day)', 1, '100% APR preserved. A 364-day grazing licence (not a tenancy) preserves the owner-occupier test because the owner retains possession and the grazier has only a licence.', '2-year occupation test: licence does not break owner-occupier status', null, 'Must be a genuine licence (364 days max, no exclusive possession). If treated as a tenancy, 7-year ownership test applies instead.', 'IHTA 1984 s 116 / IHTM24030 / Epsom Grand Stand Association v IRC'],
  ['Equestrian use', 0, 'Stud farms (breeding horses) can qualify for APR because breeding is agricultural. Livery yards (boarding and exercising horses for others) do NOT qualify — livery is not agriculture.', 'APR only for agricultural use. Horse breeding = agriculture. Horse boarding/riding = not agriculture.', null, 'Mixed equestrian operations need careful apportionment. Stud farms with grazing land may qualify on the agricultural portion. Riding schools and liveries are excluded.', 'IHTA 1984 s 115(2) / HMRC IHTM24055 / Wheatley v IRC'],
  ['Woodland on farm', 0, 'Woodland is NOT agricultural property for APR. However, woodland may qualify for BPR (Business Property Relief) at 100% if the woodland is part of a qualifying business. Woodlands Relief (IHTA 1984 s 125) allows deferral of IHT on growing timber value.', 'APR requires agricultural property — commercial woodland is a separate relief category', null, 'Farm woodland: consider BPR (not APR). Growing timber can be deferred via Woodlands Relief. Land value still taxable.', 'IHTA 1984 s 125 (Woodlands Relief) / IHTM04271 / IHTA 1984 s 103 (BPR)'],
];

for (const [scenario, relief, conditions, occupation, clawback, notes, ref] of aprData) {
  db.run(
    `INSERT INTO apr_guidance (scenario, relief_available, conditions, occupation_test, clawback_period, notes, hmrc_ref, jurisdiction)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'GB')`,
    [scenario, relief, conditions, occupation, clawback, notes, ref]
  );
}

// ── Tenancy Rules ───────────────────────────────────────────────────

const tenancyData: [string, string, string, string, string][] = [
  ['AHA_1986', 'Succession', 'Up to 2 successions allowed (3 total tenancies including original). Successor must be a close family member (spouse, child, sibling, etc.) and must demonstrate that their principal source of livelihood has been derived from agricultural work on the holding for 5 of the preceding 7 years.', 'Close family only. Livelihood test: principal livelihood from farming the holding for 5/7 years. Suitability test: must be capable of farming the holding.', 'AHA 1986 ss 36-48'],
  ['AHA_1986', 'Rent review', 'Rent reviews every 3 years. Either party can demand a review. Rent determined by productive capacity of the holding (not open market rent). Disputes resolved by RICS arbitration.', 'Rent based on productive capacity, not open market value. Either party can trigger a review.', 'AHA 1986 s 12'],
  ['AHA_1986', 'Compensation', 'Tenant entitled to compensation for improvements at end of tenancy, provided landlord consented (or tribunal approval obtained). Compensation based on increase in value of the holding.', 'Landlord consent required for most improvements (some short-term improvements exempt).', 'AHA 1986 ss 64-83'],
  ['AHA_1986', 'Security of tenure', 'Lifetime security of tenure. Very difficult for landlord to terminate — only for breach, non-agricultural use, or planning permission for non-agricultural development. Tenant protected even after retirement if successor available.', 'Termination only for specific statutory grounds. Cannot terminate simply because landlord wants land back.', 'AHA 1986 ss 25-27'],
  ['ATA_1995', 'Term', 'Fixed-term Farm Business Tenancy (FBT) of 2 or more years. No automatic succession rights. Tenancy ends at expiry of term unless parties agree to renew.', 'Minimum 2-year term for FBT. Shorter agreements possible but may not qualify as FBT.', 'ATA 1995 ss 1-8'],
  ['ATA_1995', 'Rent review', 'Rent review as per the tenancy agreement, typically every 3 years. Open market rent basis (unlike AHA productive capacity basis). Either party can refer to arbitration.', 'Open market rent, not productive capacity. Agreement terms govern review frequency.', 'ATA 1995 ss 9-14'],
  ['ATA_1995', 'Compensation', 'Tenant entitled to compensation for tenant improvements if landlord consented. Compensation for routine improvements as per agreement.', 'Landlord consent required. Amount based on increase in holding value.', 'ATA 1995 ss 15-27'],
  ['ATA_1995', 'Termination', 'Tenancy ends at expiry of fixed term. Landlord must give at least 12 months notice before term end. If no notice given, tenancy continues from year to year.', 'Minimum 12 months notice to quit. If neither party gives notice, rolls to periodic tenancy.', 'ATA 1995 s 5-7'],
  ['AHA_1986', 'Gladstone v Bower', 'Tenancy for less than 1 year and 364 days (i.e., less than 2 years) can avoid AHA 1986 succession rights. Commonly used by landlords to avoid creating full AHA tenancies. However, successive short lettings may be treated as a single AHA tenancy.', 'Must be genuinely short-term. Repeated renewals may create an AHA tenancy by estoppel.', 'Gladstone v Bower [1960] / AHA 1986 s 2'],
  ['AHA_1986', 'Tenant right', 'Outgoing tenant entitled to compensation for growing crops, cultivations, and unexpired manures/fertiliser applications at end of tenancy. This is the tenant right claim.', 'Valued at cost of inputs applied less benefit already obtained. Standard industry practice.', 'AHA 1986 s 65 / custom of the country'],

  // ── New tenancy rules ─────────────────────────────────────────────────
  ['ATA_1995', 'Right to diversify', 'Under the ATA 1995 s.7 the tenant has the right to request the landlord\'s consent to diversify the use of the holding. The tenant must serve a s.7 notice specifying the proposed diversification. The landlord has 30 days to object. If the landlord objects unreasonably, the tenant can refer to arbitration. This right does not apply to AHA tenancies.', 'Tenant must serve a s.7 notice. Landlord can object on grounds including prejudice to the reversionary interest. Arbitration resolves disputes.', 'ATA 1995 s 7'],
  ['AHA_1986', 'Rent basis (productive capacity)', 'AHA 1986 rents are based on the productive capacity of the holding, not open market rent. This means the rent reflects what a competent tenant could produce from the land, not what the market would pay. The formula-based approach protects tenants from speculative rent increases.', 'Rent set by arbitrator based on productive capacity. Not comparable to open market FBT rents.', 'AHA 1986 s 12 / Schedule 2'],
  ['ATA_1995', 'Rent basis (open market)', 'ATA 1995 rent is based on open market rent — what a willing tenant would pay a willing landlord on the terms of the tenancy. This typically produces higher rents than the AHA productive capacity basis.', 'Open market rent. Reviewed per tenancy agreement terms. Either party can refer to arbitration.', 'ATA 1995 ss 9-14'],
  ['AHA_1986', 'Tenant improvements compensation (detailed)', 'Compensation for improvements at end of tenancy is split into long-term (Schedule 7) and short-term (Schedule 8) categories. Long-term improvements (buildings, drainage, roads) require landlord consent and are compensated at the value of the improvement to an incoming tenant. Short-term improvements (mole drainage, chalking, liming, application of purchased manure) may not require consent and are compensated based on unexpired value.', 'Long-term: landlord consent or tribunal approval required. Short-term: some do not require consent. Compensation claim must be made before tenancy end.', 'AHA 1986 ss 64-83 / Schedules 7-8'],
  ['AHA_1986', 'Retirement and succession', 'An AHA tenant has no statutory right to retire and nominate a successor outside the succession provisions. The tenant can surrender the tenancy, but this extinguishes it. Retirement succession requires the successor to satisfy the livelihood and suitability tests. Some landlords may negotiate a voluntary retirement arrangement outside the statutory framework.', 'Succession tests still apply on retirement. Landlord and tenant may negotiate terms. No automatic retirement-triggered succession.', 'AHA 1986 ss 36-48 / RICS guidance'],
];

for (const [type, topic, rule, conditions, section] of tenancyData) {
  db.run(
    `INSERT INTO tenancy_rules (tenancy_type, topic, rule, conditions, act_section, jurisdiction)
     VALUES (?, ?, ?, ?, ?, 'GB')`,
    [type, topic, rule, conditions, section]
  );
}

// ── Diversification ─────────────────────────────────────────────────

const diversData: [string, string | null, number | null, string, string][] = [
  ['Agricultural building to dwellings (Class Q)', 'Class Q', 865, 'New dwelling qualifies for council tax, not business rates', 'Convert agricultural building to up to 5 dwellings (max 865 m2 total floor area). Permitted development — prior approval required from LPA for transport, contamination, flooding, noise, design. Building must have been in agricultural use on 20 March 2013 or last used as such. Structural works limited — building must be capable of conversion without substantial rebuild.'],
  ['Agricultural building to retail/farm shop (Class R)', 'Class R', 500, 'Business rates apply to commercial use', 'Convert agricultural building to retail (farm shop), storage, or distribution use. Max 500 m2 floor area. Permitted development — 28-day prior notification to LPA required. Building must be on an agricultural unit of at least 5 hectares.'],
  ['Agricultural building to school/nursery (Class S)', 'Class S', 500, 'Exempt from business rates if state-funded', 'Convert agricultural building to state-funded school or registered nursery. Max 500 m2 floor area. Permitted development with prior approval.'],
  ['Farm shop (new build)', null, null, 'Business rates apply; may qualify for small business rate relief', 'New-build farm shop requires full planning permission from LPA if not using permitted development Class R conversion. Must comply with local plan policies on retail in rural areas.'],
  ['Camping and glamping', null, null, 'May qualify as small business for rates; certificated site status avoids full licence', '28-day camping exemption per calendar year per field without planning permission (Caravan Sites and Control of Development Act 1960). Beyond 28 days requires planning permission and/or caravan site licence. Certificated site status from Camping and Caravanning Club allows up to 5 units without full site licence.'],
  ['Renewable energy (solar farm)', null, null, 'Business rates apply to solar installations; may offset against farm income', 'Solar farms under 50 MW determined by local planning authority (LPA). Over 50 MW is a Nationally Significant Infrastructure Project (NSIP) requiring Development Consent Order. DEFRA prefers agricultural land class 3b or worse for solar — use of Best and Most Versatile land (class 1, 2, 3a) is discouraged.'],

  // ── New diversification activities ────────────────────────────────────
  ['Holiday lets / Airbnb', null, null, 'Council tax (not business rates) unless qualifying as Furnished Holiday Letting (FHL) — FHL tax advantages removed from April 2025. Small business rate relief may apply to separate units.', 'Requires planning permission for change of use from agricultural (C3 or sui generis depending on scale). FHL previously offered capital allowances, loss offset, and CGT relief — these advantages were removed from April 2025 by Finance Act 2024. Must comply with fire safety, EPC, and local licensing requirements (e.g. mandatory registration in England from 2025).'],
  ['Farm wedding venue', null, null, 'Business rates apply; rateable value depends on facilities and capacity', 'Full planning permission required for change of use (sui generis). Premises licence under Licensing Act 2003 required for sale of alcohol. Personal licence holder needed. Temporary Event Notices (TEN) for occasional events (max 15 per year). Noise management plan typically required by LPA — condition on hours of operation. Environmental Health may impose noise limits. £10m+ public liability insurance standard.'],
  ['Educational farm visits', null, null, 'May be exempt from business rates if linked to agricultural use', 'No change of use planning permission required if visits are ancillary to the farming operation. Registration with local authority if providing for children under 8 for more than 2 hours. DBS checks required for all staff working with children. Minimum £10m public liability insurance. Risk assessments required. Must comply with Learning Outside the Classroom quality badge standards (recommended, not mandatory).'],
  ['Kennels / cattery', null, null, 'Business rates apply; rateable value based on capacity', 'Full planning permission required — kennels and catteries are typically classified as sui generis use. Animal boarding licence required from local authority under The Animal Welfare (Licensing of Activities Involving Animals) (England) Regulations 2018. Licence renewed annually. Minimum standards for accommodation, exercise, hygiene, and veterinary provision. Environmental Health may impose conditions on noise and waste disposal.'],
];

for (const [activity, pdClass, maxArea, ratesImpact, notes] of diversData) {
  db.run(
    `INSERT INTO diversification (activity, pd_class, max_floor_area_m2, business_rates_impact, planning_notes, jurisdiction)
     VALUES (?, ?, ?, ?, ?, 'GB')`,
    [activity, pdClass, maxArea, ratesImpact, notes]
  );
}

// ── FTS5 Search Index ───────────────────────────────────────────────

const ftsEntries: [string, string, string][] = [
  // Rotation
  ['Winter wheat after oilseed rape rotation', 'Winter wheat following oilseed rape is a standard UK rotation. Break crop benefit improves yield by 5-10% over second wheat. OSR provides different disease spectrum reducing take-all risk.', 'rotation'],
  ['Second wheat yield penalty', 'Second wheat (winter wheat after winter wheat) incurs a 10-15% yield penalty. Blackgrass risk is HIGH in continuous cereal rotations. Take-all disease builds up year on year.', 'rotation'],
  ['Oilseed rape 4-year break clubroot', 'Oilseed rape requires minimum 4-year break between OSR crops to manage clubroot and sclerotinia. OSR after OSR should be avoided.', 'rotation'],
  ['Beans nitrogen fixation rotation', 'Beans fix atmospheric nitrogen, reducing N fertiliser need for following crop by 30-50 kg/ha. Good break from cereal diseases. Low blackgrass risk.', 'rotation'],
  ['Spring cropping blackgrass control', 'Spring barley is the most effective rotational tool for blackgrass control. Delays drilling until March, preventing autumn germination flush of blackgrass.', 'rotation'],
  ['Potatoes 5-year break PCN blight', 'Potatoes require minimum 5-year rotation break for PCN and blight control. High gross margin but high input costs and disease risk with short rotations.', 'rotation'],
  // New rotation FTS
  ['Maize after grass ley rotation', 'Maize after grass benefits from ley N fixation and improved soil structure. 2-3 year grass ley rebuilds organic matter. Continuous maize acceptable for 2-3 years but compaction risk increases.', 'rotation'],
  ['Winter rye blackgrass management', 'Winter rye is competitive against blackgrass due to early vigorous growth. Early harvest in July. Cover crop sowing Aug-Sep, destroy by Feb. Spring cropping essential for blackgrass — delayed drilling late Oct as alternative.', 'rotation'],
  ['Peas hemp herbal ley break crops', 'Peas fix N at 50-80 kg/ha. Hemp needs Home Office licence, good break crop. Herbal leys (SFI option, 5+ species) build soil health. Cover crop timing: sow Aug-Sep, destroy by Feb.', 'rotation'],
  // Margins
  ['Winter wheat gross margin 2024/25', 'Winter wheat gross margin 2024/25: output £1,530/ha, variable costs £650/ha, gross margin £880/ha. Top quartile £1,100/ha, bottom quartile £600/ha.', 'margins'],
  ['Dairy cow gross margin', 'Dairy cow gross margin 2024/25: output £2,800/head, variable costs £1,900/head, GM £900/head. Top quartile £1,300/head.', 'margins'],
  ['Lowland ewe sheep gross margin', 'Lowland ewe gross margin: output £145/head, variable costs £65/head, GM £80/head. Top quartile £120, bottom £30.', 'margins'],
  ['Potatoes high margin high risk', 'Potatoes (maincrop) gross margin £2,300/ha but variable costs £3,200/ha. High output £5,500/ha. Top quartile £3,500, bottom £800.', 'margins'],
  ['Break even analysis farming enterprise', 'Break-even analysis compares total costs (variable + fixed) against output. If costs exceed output, the enterprise is loss-making. Use gross margin benchmarks to assess.', 'margins'],
  // New margins FTS
  ['Spring oats pig finishing sow gross margins', 'Spring oats GM £530/ha. Pig finishing GM £15/pig (tight margins, top £30, bottom -£10). Sow breeding herd GM £400/sow/yr. Milk 10ppl GM per litre.', 'margins'],
  ['Strawberries asparagus horticulture gross margins', 'Strawberries GM £15,000/ha (output £40,000, VC £25,000). Asparagus GM £7,000/ha (output £12,000, VC £5,000). High returns but high capital and labour costs.', 'margins'],
  ['Upland suckler goats dairy gross margins', 'Upland suckler cow GM £400/head (output £800, VC £400). Goats dairy GM £250/head (output £600, VC £350). Niche enterprises.', 'margins'],
  // Tax
  ['Making Tax Digital MTD income tax', 'MTD for Income Tax mandatory from April 2026 for income over £50,000. Quarterly updates via compatible software. Threshold drops to £30,000 from April 2027.', 'tax'],
  ['Farmers averaging profits 2 or 5 years', 'Farmers can average profits over 2 or 5 years. Claim within first anniversary of filing deadline. Smooths volatile farming income for income tax.', 'tax'],
  ['Capital allowances AIA plant machinery', 'Annual Investment Allowance £1,000,000 for qualifying plant and machinery. 100% first-year allowance. Structures and Buildings Allowance 3% over 33.33 years for farm buildings.', 'tax'],
  ['Flat rate VAT agriculture scheme', 'Agricultural flat rate scheme: 4% flat rate addition on sales. General flat rate 6.5% for agriculture. Cannot reclaim input VAT under flat rate scheme.', 'tax'],
  ['Partnership tax farming self assessment', 'Each partner files self-assessment. Profit allocation per partnership agreement. Partnership return SA800 filed separately. Late filing £100 per partner.', 'tax'],
  ['Inheritance tax nil rate band 325000', 'IHT at 40% above nil rate band of £325,000 (frozen to April 2028). Residence nil rate band £175,000 for direct descendants. APR and BPR can reduce farming IHT.', 'tax'],
  // New tax FTS
  ['Rollover relief CGT reinvestment', 'CGT deferred when reinvesting disposal proceeds in qualifying business assets within 3 years. Applies to land, buildings, fixed plant. Gain deducted from replacement asset base cost.', 'tax'],
  ['Herd basis accounting irrevocable election', 'Irrevocable election to treat production herd as capital asset. Herd sales not taxable if replaced. Applies to dairy cows, breeding ewes, sows. Election within 2 years.', 'tax'],
  ['SFI CS payments taxable income', 'SFI and Countryside Stewardship payments are taxable farming income. Not capital. Sporting rights income also taxable, may affect APR. Seasonal workers subject to PAYE.', 'tax'],
  // APR
  ['Agricultural Property Relief APR inheritance tax', 'APR provides 100% or 50% relief from IHT on agricultural property. Owner-occupier: 100% after 2 years. Tenanted pre-1995: 50%. Post-1995 FBT: 100%.', 'apr'],
  ['APR farmhouse character appropriate test', 'HMRC tests whether farmhouse is proportionate to the farming operation. Lloyds TSB v IRC (2002) established the character appropriate test. A mansion on a small farm will fail.', 'apr'],
  ['APR diversified land no relief', 'No APR on diversified-use land: farm shop buildings, holiday lets, solar panels, equestrian use. Only the agricultural portion qualifies for IHT relief.', 'apr'],
  ['APR 50% pre-1995 AHA tenancy', '50% APR rate applies to land let on pre-September 1995 AHA tenancies. Post-1995 FBT tenancies qualify for 100%. Consider BPR top-up for active farming landlords.', 'apr'],
  ['APR clawback 7 years', 'APR can be clawed back if property is sold or use changes within 7 years of the transfer. Applies to both death and lifetime gifts.', 'apr'],
  // New APR FTS
  ['Solar farms NO APR SFI land retains APR', 'Solar panels on farmland: NO APR. SFI/CS agreement land: retains APR (agri-environmental = agricultural). Short-term grazing licence (364-day) preserves APR.', 'apr'],
  ['Equestrian APR stud farm vs livery', 'Stud farms (breeding): APR eligible. Livery yards (boarding): NO APR. Woodland: BPR not APR (different relief). Mixed operations need careful apportionment.', 'apr'],
  // Tenancy
  ['AHA 1986 succession rights livelihood test', 'AHA 1986 tenancies allow up to 2 successions. Close family only. Livelihood test: principal livelihood from farming the holding for 5 of preceding 7 years.', 'tenancy'],
  ['ATA 1995 FBT fixed term no succession', 'Farm Business Tenancies under ATA 1995: fixed term (2+ years), no automatic succession rights, open market rent reviews, 12+ months notice to terminate.', 'tenancy'],
  ['Gladstone v Bower short tenancy trick', 'Gladstone v Bower: tenancy for less than 2 years avoids AHA succession. Used by landlords to prevent creating full AHA tenancies. Repeated renewals risky — may create AHA by estoppel.', 'tenancy'],
  ['AHA rent productive capacity not market', 'AHA 1986 rent based on productive capacity of holding, not open market rent. This protects tenants from market-rate increases. ATA 1995 uses open market rent.', 'tenancy'],
  ['Tenant right compensation outgoing', 'Outgoing tenant entitled to compensation for growing crops, cultivations, and unexpired manures at end of tenancy. Valued at cost less benefit received.', 'tenancy'],
  // New tenancy FTS
  ['ATA tenant right to diversify s7 notice', 'ATA 1995 s.7: tenant can serve notice to diversify. Landlord has 30 days to object. Unreasonable objection can be referred to arbitration. AHA rent = productive capacity. ATA rent = open market.', 'tenancy'],
  ['Tenant improvements compensation long short term', 'AHA improvements: long-term (buildings, drainage) need consent, compensated at value to incoming tenant. Short-term (liming, manure) may not need consent. Retirement from AHA: no automatic succession trigger.', 'tenancy'],
  // Diversification
  ['Class Q permitted development dwelling conversion', 'Class Q: convert agricultural building to up to 5 dwellings (max 865 m2). Permitted development with prior approval. Building must be capable of conversion without substantial rebuild.', 'diversification'],
  ['Class R farm shop conversion 500m2', 'Class R: convert agricultural building to retail/farm shop (max 500 m2). Permitted development. 28-day prior notification. Unit must be at least 5 hectares.', 'diversification'],
  ['Camping glamping 28-day exemption planning', '28-day camping exemption per field per year without planning permission. Beyond 28 days needs planning permission or caravan site licence. Certificated sites allow 5 units.', 'diversification'],
  ['Solar farm planning agricultural land classification', 'Solar farms under 50 MW to LPA. Over 50 MW is NSIP. DEFRA prefers class 3b or worse agricultural land. Best and Most Versatile land (1, 2, 3a) discouraged for solar.', 'diversification'],
  // New diversification FTS
  ['Holiday lets Airbnb FHL tax treatment', 'Holiday lets require planning permission. FHL tax advantages removed from April 2025. Mandatory registration in England from 2025. Fire safety, EPC compliance required.', 'diversification'],
  ['Farm wedding venue licensing noise', 'Wedding venue: full planning (sui generis). Premises licence for alcohol. TEN for occasional events (max 15/year). Noise management plan. £10m+ public liability.', 'diversification'],
  ['Educational farm visits DBS insurance', 'Educational visits: no planning if ancillary to farming. DBS checks for staff with children. £10m+ public liability. Registration if children under 8 for 2+ hours.', 'diversification'],
  ['Kennels cattery planning licensing', 'Kennels and catteries: full planning (sui generis). Animal boarding licence required annually. Minimum standards for accommodation, exercise, hygiene, vet provision.', 'diversification'],
];

for (const [title, body, topic] of ftsEntries) {
  db.run(
    `INSERT INTO search_index (title, body, topic, jurisdiction) VALUES (?, ?, ?, 'GB')`,
    [title, body, topic]
  );
}

// ── Metadata ────────────────────────────────────────────────────────

const today = new Date().toISOString().split('T')[0];
db.run("INSERT OR REPLACE INTO db_metadata (key, value) VALUES ('last_ingest', ?)", [today]);
db.run("INSERT OR REPLACE INTO db_metadata (key, value) VALUES ('build_date', ?)", [today]);

// ── Coverage JSON ───────────────────────────────────────────────────

function count(table: string): number {
  const row = db.get<{ c: number }>(`SELECT COUNT(*) as c FROM ${table}`);
  return row?.c ?? 0;
}

const counts = {
  rotation_guidance: count('rotation_guidance'),
  gross_margins: count('gross_margins'),
  tax_rules: count('tax_rules'),
  apr_guidance: count('apr_guidance'),
  tenancy_rules: count('tenancy_rules'),
  diversification: count('diversification'),
  fts_entries: count('search_index'),
};

const coverage = {
  mcp_name: 'UK Farm Planning MCP',
  jurisdiction: 'GB',
  build_date: today,
  ...counts,
  source_hash: 'computed-at-build',
};

writeFileSync(join(DATA_DIR, 'coverage.json'), JSON.stringify(coverage, null, 2) + '\n');

console.log('Ingestion complete:');
console.log(`  Rotation guidance: ${counts.rotation_guidance}`);
console.log(`  Gross margins: ${counts.gross_margins}`);
console.log(`  Tax rules: ${counts.tax_rules}`);
console.log(`  APR guidance: ${counts.apr_guidance}`);
console.log(`  Tenancy rules: ${counts.tenancy_rules}`);
console.log(`  Diversification: ${counts.diversification}`);
console.log(`  FTS entries: ${counts.fts_entries}`);

db.close();
