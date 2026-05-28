export interface CosmicObject {
  id: string;
  name: string;
  commonName?: string;
  type: 'black_hole' | 'star' | 'nebula' | 'cluster' | 'exoplanet' | 'pulsar';
  spectralType?: string; // e.g. O5, B2, G2V, M1V (Planck Temperature lookup)
  temperature?: number; // Kelvin
  distance: number; // light-years from Earth
  luminosity?: number; // Solar luminosities
  radius?: number; // Solar radii
  apparentMagnitude?: number;
  absoluteMagnitude?: number;
  description: string;
  culturalSignificance?: string;
  position: [number, number, number]; // [x, y, z] in light-year scale or relative simulation units
  exoplanetsCount?: number;
  funFact?: string;
}

export interface GuidedTour {
  id: string;
  title: string;
  description: string;
  durationString: string;
  steps: TourStep[];
}

export interface TourStep {
  title: string;
  description: string;
  targetId: string; // ID of the CosmicObject to view/focus
  cameraOffset: [number, number, number]; // Position offset for dramatic viewing angle
  duration: number; // Duration of transit (ms)
}

// Global catalog of 20+ prominent scientific hero objects
export const HERO_COSMIC_CATALOG: CosmicObject[] = [
  {
    id: "sgr-a-star",
    name: "Sagittarius A*",
    commonName: "Galactic Core Black Hole",
    type: "black_hole",
    spectralType: "Singularity",
    temperature: 0,
    distance: 26673,
    luminosity: 0,
    radius: 31, // In solar radii (~22 million km event horizon)
    apparentMagnitude: 25.0, // Obliterated by dust
    absoluteMagnitude: -5.0,
    description: "The supermassive black hole at the gravitational heart of the Milky Way, containing approximately 4.1 million solar masses.",
    culturalSignificance: "Discovered in 1974, its accretion disk was imaged by the Event Horizon Telescope in 2022, confirming Einstein's General Relativity.",
    position: [0, 0, 0], // True galactic center (0,0,0)
    funFact: "Time runs approximately 15% slower near the event horizon relative to a distant observer due to intense gravitational dilation."
  },
  {
    id: "sol",
    name: "The Sun",
    commonName: "Sol",
    type: "star",
    spectralType: "G2V (Yellow Dwarf)",
    temperature: 5778,
    distance: 0.0000158, // 1 AU = 1.58e-5 ly
    luminosity: 1.0,
    radius: 1.0,
    apparentMagnitude: -26.74,
    absoluteMagnitude: 4.83,
    description: "Our parent yellow dwarf main sequence star, located in the local Orion Cygnus arm, orbiting the galactic center at about 230 km/s.",
    culturalSignificance: "Worshipped by virtually all ancient civilizations. Centered in Heliocentrism by Copernicus and Galileo.",
    position: [0, 100, 26000], // Earth/Sol offset. Let's represent Earth/Sol at ~26,000 ly from center along Z-axis
    exoplanetsCount: 8,
    funFact: "Light takes about 8 minutes and 20 seconds to travel from Sol's surface to Earth, but took 100,000 years to escape the core."
  },
  {
    id: "alpha-centauri",
    name: "Alpha Centauri A",
    commonName: "Rigil Kentaurus",
    type: "star",
    spectralType: "G2V",
    temperature: 5790,
    distance: 4.37,
    luminosity: 1.52,
    radius: 1.22,
    apparentMagnitude: -0.01,
    absoluteMagnitude: 4.38,
    description: "The primary member of the nearest stellar system to Earth, sharing a binary orbit with Proxima and Alpha Centauri B.",
    culturalSignificance: "Primary staging ground for interstellar science fiction and the target of the real BreakThrough Starshot interstellar micro-probe project.",
    position: [1.3, 101, 25997], // Extremely close to Sol
    exoplanetsCount: 1,
    funFact: "Orbiting Alpha Centauri's companion Proxima is a rocky planet perfectly located within its host star's liquid-water habitable zone."
  },
  {
    id: "proxima-b",
    name: "Proxima Centauri b",
    commonName: "Nearest Exoplanet",
    type: "exoplanet",
    spectralType: "Habitable Zone Planet",
    temperature: 234, // Effective temperature
    distance: 4.24,
    description: "A rocky exoplanet orbiting within the habitable zone of the red dwarf star Proxima Centauri, our closest stellar neighbor.",
    position: [1.2, 100.8, 25996],
    funFact: "Proxima Centauri b is tidally locked, meaning one side of the planet permanently faces its star in eternal day while the other is in frozen night."
  },
  {
    id: "sirius",
    name: "Sirius A",
    commonName: "The Dog Star",
    type: "star",
    spectralType: "A1V (White Main Sequence)",
    temperature: 9940,
    distance: 8.6,
    luminosity: 25.4,
    radius: 1.71,
    apparentMagnitude: -1.46,
    absoluteMagnitude: 1.42,
    description: "The brightest star in Earth's nighttime sky, radiating brilliant bluish-white light. It is accompanied by a white dwarf companion, Sirius B.",
    culturalSignificance: "Used by ancient Egyptians to predict the annual flooding of the Nile. Known as Sirius, Greek for 'glowing' or 'scorching'.",
    position: [-4.2, 95, 26005],
    funFact: "Sirius is gradually moving closer to our Solar System, which will cause its apparent brightness to increase further over the next 60,000 years."
  },
  {
    id: "betelgeuse",
    name: "Betelgeuse",
    commonName: "Alpha Orionis",
    type: "star",
    spectralType: "M1-M2Ia-ab (Red Supergiant)",
    temperature: 3500,
    distance: 640,
    luminosity: 126000,
    radius: 887, // Giant shell
    apparentMagnitude: 0.5,
    absoluteMagnitude: -5.85,
    description: "An aging semi-regular variable red supergiant in Orion. It is one of the largest stars visible to the naked eye; if placed in our Solar System, it would swallow Mars and Jupiter.",
    culturalSignificance: "Caused international scientific sensation in 2019-2020 during the 'Great Dimming' event, indicating massive dust ejection prior to a future supernova.",
    position: [320, 240, 25600],
    funFact: "When Betelgeuse explodes as a supernova (anytime in the next 100,000 years), it will shine as bright as the half-moon in the daytime sky for weeks."
  },
  {
    id: "m42-orion",
    name: "Messier 42",
    commonName: "Orion Nebula",
    type: "nebula",
    spectralType: "H II Stellar Nursery",
    distance: 1342,
    luminosity: 300000,
    description: "A massive, brightly lit diffuse emission nebula situated in the Milky Way south of Orion's Belt. It is one of the most studied and photographed celestial objects.",
    culturalSignificance: "First documented by French astronomer Nicolas-Claude Fabri de Peiresc in 1610, it represents the archetypal cosmic birthing place of stars.",
    position: [550, -120, 25200],
    funFact: "The Orion Nebula contains hundreds of newborn stars and 'protoplanetary disks' (proplyds) that are currently forming new planetary systems."
  },
  {
    id: "m16-eagle",
    name: "Messier 16",
    commonName: "Eagle Nebula",
    type: "nebula",
    spectralType: "Emission Nebula & Cluster",
    distance: 5700,
    description: "An active star-forming region containing the famous 'Pillars of Creation', which are majestic towers of cold molecular hydrogen gas and dust.",
    culturalSignificance: "Imaged by NASA's Hubble Space Telescope in 1995 andJWST in 2022, creating some of the most iconic images of humanity's cosmic exploration.",
    position: [2100, 300, 22400],
    funFact: "The 'Pillars of Creation' inside the Eagle Nebula are nearly 5 light-years tall, meaning a capsule traveling at light speed would take 5 years to cross them."
  },
  {
    id: "m1-crab",
    name: "Messier 1",
    commonName: "Crab Nebula",
    type: "nebula",
    spectralType: "Supernova Remnant",
    distance: 6500,
    description: "An expanding cloud of gas ejected by a giant supernova explosion. At its dead center sits the Crab Pulsar, spinning 30 times per second.",
    culturalSignificance: "Recorded by Chinese and Arab astronomers in 1054 AD as a 'guest star' visible during daylight for 23 consecutive days.",
    position: [-1500, -850, 24100],
    funFact: "The gas fibers in the nebula are expanding outwards at an incredible rate of 1,500 kilometers per second, or 0.5% the speed of light."
  },
  {
    id: "pleiades",
    name: "Messier 45",
    commonName: "The Pleiades (Seven Sisters)",
    type: "cluster",
    spectralType: "B-Type (Hot-Blue) Cluster",
    distance: 444,
    description: "A prominent open star cluster containing middle-aged, hot B-type stars. Surrounded by an elegant blue reflection nebula woven from cosmic dust particles.",
    culturalSignificance: "Revered in Greek mythology, Japanese lore ('Subaru'), and North American indigenous calendars as a key visual marker of seasons.",
    position: [-100, 180, 25800],
    funFact: "The cluster is dominated by hot, luminous blue stars that have formed during the last 100 million years, which is extremely young for stars."
  },
  {
    id: "m13-hercules",
    name: "Messier 13",
    commonName: "Hercules Globular Cluster",
    type: "cluster",
    spectralType: "Globular Cluster (Pop II)",
    distance: 22200,
    description: "A massive spherical swarm of several hundred thousand extremely old stars, located in the halo of our galaxy, tightly bound by mutual gravitation.",
    culturalSignificance: "Chosen as the target of the famous 'Arecibo Message' beamed into deep space in 1974 to contact potential extraterrestrial civilizations.",
    position: [7500, 12000, 15000],
    funFact: "Stars at the core of M13 are packed so tightly together that they are 500 times more concentrated than the stars in Sol's galactic neighborhood."
  },
  {
    id: "kepler-186f",
    name: "Kepler-186f",
    commonName: "Earth's Cousin",
    type: "exoplanet",
    spectralType: "Rocky Habitability Class",
    distance: 582,
    description: "The first validated Earth-sized planet orbiting in the habitable zone of a distant star, Kepler-186, an M-dwarf in the Cygnus constellation.",
    position: [120, 290, 25750],
    funFact: "Because Kepler-186 is a cool Red Dwarf star, midday sun on Kepler-186f would only shine with the brightness of Earth's warm sunset."
  },
  {
    id: "kepler-22b",
    name: "Kepler-22b",
    commonName: "The Ocean World",
    type: "exoplanet",
    spectralType: "Super-Earth",
    distance: 635,
    description: "A super-Earth class exoplanet orbiting within the habitable zone of a G-type star similar to Sol. It is suspected to be covered in a massive global ocean.",
    position: [-300, -110, 25550],
    funFact: "Kepler-22b is roughly 2.4 times Earth's radius, but has an orbital year that matches Earth's very closely at 290 days."
  },
  {
    id: "trappist-1e",
    name: "TRAPPIST-1e",
    commonName: "Liquid Ocean Candidate",
    type: "exoplanet",
    spectralType: "Earth-like Habitability Zone",
    distance: 40.7,
    description: "An ultra-dense, rocky Earth-sized exoplanet orbiting with six companion planets around the ultra-cool red dwarf star TRAPPIST-1.",
    position: [-5, 24, 25985],
    funFact: "TRAPPIST-1e sits in the absolute center of its system's habitable zone. From its red surface, its sister planets would appear larger than Earth's moon."
  },
  {
    id: "vela-pulsar",
    name: "Vela Pulsar",
    commonName: "PSR B0833-45",
    type: "pulsar",
    spectralType: "Neutron Star Singularity",
    temperature: 1000000,
    distance: 950,
    description: "A superdense spinning neutron star born from a core-collapse supernova. It emits narrow beams of radio waves and gamma rays across the cosmos.",
    position: [-800, 90, 26200],
    funFact: "The Vela Pulsar has a diameter of only 20 kilometers, yet holds more mass than the complete Solar system, spinning over 11 times per second."
  }
];

// Interactive guided cosmic journeys
export const GUIDED_TOURS: GuidedTour[] = [
  {
    id: "cosmic-neighbor",
    title: "Our Cosmic Neighborhood",
    description: "Embark from our home planet and visit our closest stellar neighbors, local bubble limits, and nearby exoplanets.",
    durationString: "~3 Minutes",
    steps: [
      {
        title: "The Heart of Sol",
        description: "Welcome to our Solar System. Sol sits near the inner edge of the Orion Cygnus spiral arm of the Milky Way, roughly 26,000 light-years from the core.",
        targetId: "sol",
        cameraOffset: [0, 4, 15],
        duration: 3500
      },
      {
        title: "To the Nearest Neighbor",
        description: "Rigil Kentaurus (Alpha Centauri) is just 4.37 light years away. Traveling here brings you to a unique triple stellar orbital system.",
        targetId: "alpha-centauri",
        cameraOffset: [2, 5, 8],
        duration: 4000
      },
      {
        title: "Proxima b Habitability",
        description: "Orbiting closely is our nearest known exoplanet candidate. It receives only 65% of the solar energy Earth receives, but is fully rocky.",
        targetId: "proxima-b",
        cameraOffset: [1, 2, 4],
        duration: 3000
      },
      {
        title: "The Brightest Beacon",
        description: "Sirius shines brighter than any other night star. It is a luminous main-sequence engine zooming through the local disk with an ultra-dense companion.",
        targetId: "sirius",
        cameraOffset: [5, -4, 12],
        duration: 4500
      }
    ]
  },
  {
    id: "stellar-lifecycle",
    title: "Stellar Life Cycles",
    description: "Witness key stages of stellar existence, from nebular gas collapses to gigantic supergiant expansion and cosmic neutron star collapses.",
    durationString: "~4 Minutes",
    steps: [
      {
        title: "The Stellar Nursery",
        description: "Inside the Orion Nebula, cold dense gas clouds crash under gravity. Thousands of new infant planetary and stellar systems are born.",
        targetId: "m42-orion",
        cameraOffset: [250, -80, 400],
        duration: 4500
      },
      {
        title: "Aging Red Giants",
        description: "Betelgeuse is a massive red supergiant nearing the final terminal phase of nuclear silicon fusion. It is on the precipice of a spectacular core collapse.",
        targetId: "betelgeuse",
        cameraOffset: [200, 150, 350],
        duration: 4000
      },
      {
        title: "Supernova Remnants",
        description: "The Crab Nebula is the aftermath of a massive core-collapse explosion seen in 1054 AD. It scatters heavy elements like iron and gold into dust lanes.",
        targetId: "m1-crab",
        cameraOffset: [-300, -250, 500],
        duration: 4500
      },
      {
        title: "The Spinning Pulsar",
        description: "Left in the wake of supernova collapses are Pulsars. Spinning rapidly, they emit intense electromagnetic jets sweeping across orbital vectors.",
        targetId: "vela-pulsar",
        cameraOffset: [-50, 30, 80],
        duration: 4000
      }
    ]
  },
  {
    id: "galactic-architecture",
    title: "Galactic Architecture",
    description: "Ascend to God Mode and inspect the full geometrical majesty of our host galaxy, its massive spiral arms, and the central black hole.",
    durationString: "~3 Minutes",
    steps: [
      {
        title: "Sagittarius A* Singularity",
        description: "Enter the central axis. Orbiting deep in the galactic bulge is Sgr A*, the prime supermassive black hole around which the entire Milky Way rotates.",
        targetId: "sgr-a-star",
        cameraOffset: [400, 150, 500],
        duration: 5000
      },
      {
        title: "Globular Halo Swarms",
        description: "High above the galactic plane sits Messier 13. Globular clusters contain the oldest stars in our galaxy, orbiting in an expansive halo sphere.",
        targetId: "m13-hercules",
        cameraOffset: [2000, 3000, 4000],
        duration: 5000
      },
      {
        title: "Back to Sol orbits",
        description: "Return to Sol's position along the Orion branch. Our Solar System orbits comfortably away from the violent radioactive radiation of the compact core.",
        targetId: "sol",
        cameraOffset: [0, 1500, 3000],
        duration: 6000
      }
    ]
  }
];
