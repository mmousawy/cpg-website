import { classifyPageContent } from '@/lib/profileUrl/classifyPageContent';
import { extractPageSignalsFromHtml } from '@/lib/profileUrl/extractPageSignals';
import { isKnownSocialHost } from '@/lib/profileUrl/socialHosts';

export const FIXTURE_MURTADA_HTML = `<!DOCTYPE html><html><head>
<title>Murtada al Mousawy - Senior Web Developer</title>
<meta name="description" content="Portfolio of Murtada al Mousawy, Senior Web Developer in Rotterdam">
</head><body></body></html>`;

export const FIXTURE_KARSTEN_HTML = `<!DOCTYPE html><html><head>
<title>Home - Karsten.Photo</title>
<meta property="og:type" content="website">
<meta name="description" content="Photography by Karsten Risseeuw. Art photography, Landscapes, Portraits">
<script type="application/ld+json">
{"@context":"https://schema.org","@graph":[
{"@type":"Person","name":"Karsten Risseeuw"},
{"@type":"WebSite","name":"Karsten.Photo"},
{"@type":"WebPage","name":"Home"}
]}
</script>
</head><body></body></html>`;

export const FIXTURE_CLEAN_HOOOUSE_HTML = `<!DOCTYPE html><html><head>
<title>شركة تنظيف بالرياض | خصم 30% | كلين هاوس</title>
<meta property="og:type" content="website">
<meta name="description" content="شركة تنظيف بالرياض – نظافة منازل فلل مكاتب">
<script type="application/ld+json">
{"@context":"https://schema.org","@graph":[
{"@type":"Organization","name":"Clean House"},
{"@type":"Place","name":"Riyadh"},
{"@type":"PostalAddress","addressLocality":"Riyadh"}
]}
</script>
</head><body></body></html>`;

export const FIXTURE_SUPER_KSA_HTML = `<!DOCTYPE html><html><head>
<title>شركة تنظيف بجدة | خصm 45% | سوبر كلين</title>
</head><body></body></html>`;

export const FIXTURE_MEJA_SEKOLAH_HTML = `<!DOCTYPE html><html><head>
<title>Meja Sekolah – Meja Siswa &amp; Perabot Sekolah Berkualitas</title>
<meta property="og:type" content="website">
<meta name="description" content="Temukan meja sekolah berkualitas. Harga pabrik, desain modern, dan layanan pengiriman ke seluruh Indonesia.">
<script type="application/ld+json">
{"@type":"Place","name":"Factory"}
{"@type":"PostalAddress","addressCountry":"ID"}
</script>
</head><body></body></html>`;

export const FIXTURE_GREAT_TIBET_HTML = `<!DOCTYPE html><html><head>
<title>Top Tibet Tours, Tibet Tour Packages, Tibet Travel Agency</title>
<meta name="description" content="Experience the best of Tibet with our award winning service. Travel in a group or privately.">
</head><body></body></html>`;

export const FIXTURE_LAW_ESSAY_HTML = `<!DOCTYPE html><html><head>
<title>Law Dissertation Help Writing Service By Academic Solicitors</title>
<meta name="description" content="Qualified law dissertation help by senior UK solicitors and barristers who provide the best law dissertation writing service.">
<script type="application/ld+json">
{"@context":"https://schema.org","@graph":[
{"@type":"Organization","name":"Law Essay Pros"},
{"@type":"ContactPoint","contactType":"sales"}
]}
</script>
</head><body></body></html>`;

export function classifyFixture(
  html: string,
  memberFullName?: string,
) {
  return classifyPageContent(extractPageSignalsFromHtml(html), memberFullName);
}

export function expectSocialHost(url: string): boolean {
  return isKnownSocialHost(url);
}
