import type { StaticImageData } from "next/image";

// Static imports give next/image intrinsic sizes + a build-time blur placeholder (no layout shift, instant preview).
import hero from "../../public/img/hero.webp";
import story from "../../public/img/story.webp";
import team from "../../public/img/team.webp";
import poster from "../../public/img/poster.webp";
import booth from "../../public/img/booth.webp";
import gBackpack from "../../public/img/g-backpack.webp";
import gBoyBag from "../../public/img/g-boy-bag.webp";
import gDeposit from "../../public/img/g-deposit.webp";
import gFriends from "../../public/img/g-friends.webp";
import gManPeaks from "../../public/img/g-man-peaks.webp";
import gRain from "../../public/img/g-rain.webp";
import gSmile from "../../public/img/g-smile.webp";
import gWomanTrail from "../../public/img/g-woman-trail.webp";
import pCouple from "../../public/img/p-couple.webp";
import pYoungGroup from "../../public/img/p-young-group.webp";
import pBoothWoman from "../../public/img/p-booth-woman.webp";
import pMrfPilgrim from "../../public/img/p-mrf-pilgrim.webp";
import pCyclist from "../../public/img/p-cyclist-assam.webp";
import jBoothDeposit from "../../public/img/j-booth-deposit.webp";
import jMrfBuilding from "../../public/img/j-mrf-building.webp";
import jTractor from "../../public/img/j-tractor.webp";
import jBaler from "../../public/img/j-baler.webp";
import jBales from "../../public/img/j-bales.webp";
import dTempleDrive from "../../public/img/d-temple-drive.webp";
import dOmTeam from "../../public/img/d-om-team.webp";
import dTeamMountains from "../../public/img/d-team-mountains.webp";
import dGpsHill from "../../public/img/d-gps-hill.webp";
import dGpsOfficials from "../../public/img/d-gps-officials.webp";
import dGpsMeadow from "../../public/img/d-gps-meadow.webp";
import tTempleBags from "../../public/img/t-temple-bags.webp";
import tSorting from "../../public/img/t-sorting.webp";
import tRainTractor from "../../public/img/t-rain-tractor.webp";
import tBins from "../../public/img/t-bins.webp";
import tPorters from "../../public/img/t-porters.webp";
import tConstruction from "../../public/img/t-construction.webp";

export interface Photo {
  src: StaticImageData;
  hi: string;
  en: string;
  /** CSS object-position for crops — e.g. keep faces / skip a GPS-camera overlay. */
  pos?: string;
}

/**
 * Every campaign photo appears in exactly one of these groups, so no image is shown twice on the site.
 * (story.webp and the old g-women-peaks.webp were two crops of one photo — only story is kept.)
 */
export const HERO: Photo = { src: hero, pos: "50% 20%", hi: "केदारनाथ पैदल मार्ग पर कचरा संग्रह बैग के पास एक श्रद्धालु, पीछे बर्फ़ से ढकी चोटियां", en: "A pilgrim beside the waste-collection bags on the Kedarnath trail, snow peaks behind" };

export const ABOUT = {
  team: { src: team, hi: "केदारनाथ में अभियान दल", en: "Campaign team at Kedarnath" } as Photo,
  story: { src: story, pos: "50% 25%", hi: "पावन मार्ग पर बैग के साथ श्रद्धालु", en: "Pilgrims with their bags on the sacred trail" } as Photo,
  poster: { src: poster, hi: "कैरी मी बैक अभियान पोस्टर — यात्रा पूरी, कचरा वापसी ज़रूरी", en: "Carry Me Back campaign poster — Yatra complete, waste return essential" } as Photo,
};

/** "Where the waste goes" — the end-to-end chain, in order. */
export const JOURNEY: (Photo & { titleHi: string; titleEn: string })[] = [
  { src: jMrfBuilding, titleHi: "MRF, केदारनाथ", titleEn: "MRF, Kedarnath", hi: "पदार्थ पुनर्प्राप्ति केंद्र (MRF) से श्रद्धालु सूखे कचरे का बैग प्राप्त करते हैं।", en: "Pilgrims collect a bag of dry waste at the Material Recovery Facility." },
  { src: jBoothDeposit, titleHi: "गौरीकुंड कलेक्शन बूथ", titleEn: "Gaurikund collection booth", hi: "नीचे पहुंचकर बैग बूथ पर जमा होते हैं और प्रशस्ति पत्र जारी होता है।", en: "Bags are deposited at the booth and the certificate is issued." },
  { src: jTractor, titleHi: "धाम से परिवहन", titleEn: "Transport from the Dham", hi: "धाम में एकत्रित कचरा ट्रैक्टर से MRF तक पहुंचाया जाता है।", en: "Waste gathered across the Dham is moved to the MRF by tractor." },
  { src: jBaler, titleHi: "छंटाई एवं बेलिंग", titleEn: "Sorting & baling", hi: "प्लास्टिक को अलग कर बेलिंग मशीन से गट्ठर बनाए जाते हैं।", en: "Plastic is segregated and compressed into bales." },
  { src: jBales, titleHi: "पुनर्चक्रण हेतु प्रेषण", titleEn: "Sent for recycling", hi: "तैयार गट्ठर पुनर्चक्रण के लिए भेजे जाते हैं — घाटी में कुछ नहीं जाता।", en: "Bales are dispatched for recycling — nothing is dumped in the valley." },
];

/** Cleanliness drives — first item is the feature photo (grid = 1 large + 4 small). Geo-tagged images keep their GPS stamp (field evidence). */
export const DRIVES: (Photo & { geo?: string })[] = [
  { src: dTempleDrive, hi: "केदारनाथ मंदिर परिसर में संयुक्त स्वच्छता अभियान", en: "Joint cleanliness drive at the Kedarnath temple premises" },
  { src: dGpsOfficials, pos: "50% 25%", geo: "14 Aug 2026", hi: "अधिकारियों एवं सुरक्षा बलों के साथ निरीक्षण", en: "Inspection walk with officials and security forces" },
  { src: dGpsHill, pos: "50% 20%", geo: "08 Aug 2026", hi: "ऊपरी ढलानों पर कचरा संग्रह", en: "Litter pick on the upper slopes" },
  { src: dGpsMeadow, pos: "50% 20%", geo: "15 Sep 2026", hi: "बुग्यालों की सफ़ाई", en: "Clearing the alpine meadows" },
  { src: dOmTeam, pos: "50% 55%", hi: "ॐ प्रतिमा के समीप स्वच्छता दल", en: "Sanitation team by the Om sculpture" },
];

export type GalleryGroup = "pilgrims" | "booth" | "team";

export const GALLERY: (Photo & { group: GalleryGroup })[] = [
  { group: "pilgrims", src: pCouple, pos: "50% 30%", hi: "दो-दो बैग के साथ युवा श्रद्धालु", en: "Young pilgrims carrying two bags each" },
  { group: "pilgrims", src: pYoungGroup, pos: "50% 30%", hi: "युवा दल अपने बैग के साथ", en: "A group of young trekkers with their bags" },
  { group: "pilgrims", src: pCyclist, hi: "असम से साइकिल यात्रा कर पहुंचे श्रद्धालु का सम्मान", en: "Honouring a pilgrim who cycled from Assam" },
  { group: "pilgrims", src: pMrfPilgrim, pos: "50% 30%", hi: "नंगे पांव, बैग के साथ — MRF केदारनाथ", en: "Barefoot, bag in arms — at the Kedarnath MRF" },
  { group: "pilgrims", src: gBackpack, hi: "पीठ पर कचरे का बैग", en: "Carrying the bag on the back" },
  { group: "pilgrims", src: gBoyBag, hi: "युवा प्रतिभागी अपने बैग के साथ", en: "A young participant with his bag" },
  { group: "pilgrims", src: gFriends, hi: "मित्रों के साथ कैरी मी बैक", en: "Carry Me Back with friends" },
  { group: "pilgrims", src: gManPeaks, hi: "केदारनाथ मार्ग पर एक श्रद्धालु", en: "A pilgrim on the Kedarnath trail" },
  { group: "pilgrims", src: gSmile, hi: "स्वच्छता में सहभागिता की मुस्कान", en: "Smiles of participation" },
  { group: "pilgrims", src: gWomanTrail, hi: "पैदल मार्ग पर अभियान", en: "The campaign on the trek route" },
  { group: "pilgrims", src: gRain, hi: "बारिश में भी जारी सेवा", en: "Service continues even in the rain" },
  { group: "booth", src: pBoothWoman, pos: "50% 40%", hi: "गौरीकुंड बूथ पर बैग जमा करती श्रद्धालु", en: "Depositing a bag at the Gaurikund booth" },
  { group: "booth", src: gDeposit, hi: "कलेक्शन बूथ पर बैग जमा करते हुए", en: "Handing over a bag at the collection booth" },
  { group: "booth", src: booth, hi: "कैरी मी बैक कलेक्शन बूथ", en: "The Carry Me Back collection booth" },
  { group: "team", src: dTeamMountains, pos: "50% 60%", hi: "मंदिर प्रांगण में तैनात स्वच्छता कर्मी", en: "Sanitation workers on duty at the temple courtyard" },
  { group: "team", src: tTempleBags, pos: "50% 60%", hi: "मंदिर के समीप एकत्रित कचरा", en: "Waste collected beside the temple" },
  { group: "team", src: tSorting, hi: "कचरे की छंटाई करते कर्मी", en: "Workers segregating collected waste" },
  { group: "team", src: tPorters, hi: "कंधे पर कचरा ढोते कर्मी", en: "Porters carrying waste on a pole" },
  { group: "team", src: tRainTractor, hi: "बारिश में भी कचरा परिवहन", en: "Waste transport continues in the rain" },
  { group: "team", src: tBins, hi: "मंदिर मार्ग से कूड़ेदान खाली करते कर्मी", en: "Emptying bins along the temple route" },
  { group: "team", src: tConstruction, pos: "50% 40%", hi: "निर्माण क्षेत्र से कचरा हटाते कर्मी", en: "Clearing debris from a construction zone" },
];
