import { parseCsv } from './csv';
import { saveDictionary, saveDictionaryWithMixedSource, type FlashCard, type MixedDeckSource } from './storage';
import { currentLocale, t } from '../i18n';
import type { Separator } from './constants';
import { dictionary, deckSource, error } from '../state';
import { resetToIdle } from '../components/Game';

export interface SampleGame {
  id: string;
  name: string;
  separator: Separator;
  categoryPath: string[];
  language: string;
  lucky: 'never' | 'default' | 'category';
}

export const SAMPLE_GAMES: SampleGame[] = [
  {
    id: 'trivia-science-nature-starter-en',
    name: 'Science & Nature Essentials — English (25)',
    categoryPath: ['trivia', 'science-nature'],
    language: 'en',
    lucky: 'default',
    separator: '|',
  },
  {
    id: 'trivia-chemistry-foundations-en',
    name: 'Chemistry Foundations: Matter, Mixtures, and Atoms — English (21)',
    categoryPath: ['trivia', 'science-nature', 'chemistry'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'trivia-space-astronomy-essentials-en',
    name: 'Space & Astronomy Essentials — English (25)',
    categoryPath: ['trivia', 'science-nature', 'space'],
    language: 'en',
    lucky: 'default',
    separator: '|',
  },
  {
    id: 'trivia-world-geography-starter-en',
    name: 'World Geography: A Short Round — English (5)',
    categoryPath: ['trivia', 'geography', 'world'],
    language: 'en',
    lucky: 'default',
    separator: '|',
  },
  {
    id: 'trivia-world-history-short-round-en',
    name: 'World History: A Short Round — English (10)',
    categoryPath: ['trivia', 'history', 'world'],
    language: 'en',
    lucky: 'default',
    separator: '|',
  },
  {
    id: 'trivia-human-origins-starter-en',
    name: 'Human Origins: A Starter Round — English (18)',
    categoryPath: ['trivia', 'history', 'prehistory'],
    language: 'en',
    lucky: 'default',
    separator: '|',
  },
  {
    id: 'trivia-sports-rules-milestones-en',
    name: 'Sports: Rules and Milestones — English (9)',
    categoryPath: ['trivia', 'sports'],
    language: 'en',
    lucky: 'default',
    separator: '|',
  },
  {
    id: 'trivia-food-ingredients-en',
    name: 'Food: Ingredients and Kitchen Basics — English (8)',
    categoryPath: ['trivia', 'food'],
    language: 'en',
    lucky: 'default',
    separator: '|',
  },
  {
    id: 'trivia-mythology-names-symbols-en',
    name: 'Mythology: Names and Symbols — English (10)',
    categoryPath: ['trivia', 'mythology'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'trivia-friends-cast-production-en',
    name: 'Friends: Original Series Cast and Production — English (10)',
    categoryPath: ['trivia', 'television', 'friends'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'trivia-himym-cast-production-en',
    name: 'How I Met Your Mother: Original Series Cast and Production — English (10)',
    categoryPath: ['trivia', 'television', 'how-i-met-your-mother'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'trivia-twd-cast-production-en',
    name: 'The Walking Dead: Original Series Cast and Production — English (8)',
    categoryPath: ['trivia', 'television', 'the-walking-dead'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'trivia-star-trek-tos-cast-production-en',
    name: 'Star Trek: The Original Series — Cast and Original Run — English (5)',
    categoryPath: ['trivia', 'television', 'star-trek-the-original-series'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'trivia-star-wars-original-production-en',
    name: 'Star Wars: A New Hope — Original Production — English',
    categoryPath: ['trivia', 'film', 'star-wars'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'trivia-waitangi-signing-documents-en',
    name: 'Te Tiriti o Waitangi: Signing and Documents — English',
    categoryPath: ['trivia', 'history', 'oceania', 'aotearoa-new-zealand'],
    language: 'en',
    lucky: 'default',
    separator: '|',
  },
  {
    id: 'trivia-reef-building-corals-en',
    name: 'Reef-Building Corals: A Short Ecology Round — English',
    categoryPath: ['trivia', 'science-nature', 'coral-reefs'],
    language: 'en',
    lucky: 'default',
    separator: '|',
  },
  {
    id: 'trivia-japanese-woodblock-prints-en',
    name: 'Japanese Woodblock Prints: Materials and Techniques — English',
    categoryPath: ['trivia', 'arts', 'japanese-woodblock-prints'],
    language: 'en',
    lucky: 'default',
    separator: '|',
  },
  {
    id: 'trivia-human-body-clocks-en',
    name: 'Human Body Clocks: Timing and Signals — English',
    categoryPath: ['trivia', 'science-nature', 'body-clocks'],
    language: 'en',
    lucky: 'default',
    separator: '|',
  },
  {
    id: 'trivia-rocks-faults-volcanoes-en',
    name: 'Rocks, Faults & Volcanoes — English (24)',
    categoryPath: ['trivia', 'science-nature', 'earth-science'],
    language: 'en',
    lucky: 'default',
    separator: '|',
  },
  {
    id: 'trivia-dinosaurs-fossils-mesozoic-en',
    name: 'Dinosaurs, Fossils & Mesozoic Life — English (20)',
    categoryPath: ['trivia', 'science-nature', 'paleontology'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'trivia-plant-adaptations-reproduction-en',
    name: 'Plant Adaptations, Reproduction & Survival — English (20)',
    categoryPath: ['trivia', 'science-nature', 'botany'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'Malay-to-English-Darjah-6-Vocabulary-Quiz',
    name: 'Malay to English — Darjah 6 Vocabulary Quiz',
    categoryPath: ['study', 'languages', 'malay'],
    language: 'ms-en',
    lucky: 'never',
    separator: ',',
  },
  {
    id: 'Spanish-to-English-Common-Terms',
    name: 'Spanish to English — 300 Common Terms',
    categoryPath: ['study', 'languages', 'spanish'],
    language: 'es-en',
    lucky: 'never',
    separator: ',',
  },
  {
    id: 'Arabic-to-Turkish-Common-Terms',
    name: 'Arabic to Turkish — 500 Common Terms',
    categoryPath: ['study', 'languages', 'arabic'],
    language: 'ar-tr',
    lucky: 'never',
    separator: ',',
  },
  {
    id: 'Malay-to-Malay-English-Sekolah-Menengah-1-Sec1-SG',
    name: 'Malay to Malay+English — Sekolah Menengah 1 Sec1-SG',
    categoryPath: ['study', 'languages', 'malay'],
    language: 'ms-en',
    lucky: 'never',
    separator: '|',
  },
  {
    id: 'Arabic-to-Turkish-HighSchool-9-12',
    name: 'Arabic to Turkish — High School Grades 9–12',
    categoryPath: ['study', 'languages', 'arabic'],
    language: 'ar-tr',
    lucky: 'never',
    separator: ',',
  },
  {
    id: 'AI-ML-Top-100-Terminologies',
    name: 'AI & ML — Top 100 Terminologies',
    categoryPath: ['study', 'technology'],
    language: 'en',
    lucky: 'never',
    separator: '|',
  },
  {
    id: 'AI-LLM-Agentic-300-Concepts',
    name: 'AI LLM MCP & Agentic — 302 Concepts',
    categoryPath: ['study', 'technology'],
    language: 'en',
    lucky: 'never',
    separator: '|',
  },
  {
    id: 'trivia-cell-biology-essentials-en',
    name: 'Cell Biology Essentials — English (18)',
    categoryPath: ['trivia', 'science-nature', 'cell-biology'],
    language: 'en',
    lucky: 'default',
    separator: '|',
  },
  {
    id: 'trivia-water-landscapes-en',
    name: 'Water Landscapes — English (21)',
    categoryPath: ['trivia', 'geography', 'water-landscapes'],
    language: 'en',
    lucky: 'default',
    separator: '|',
  },
  {
    id: 'trivia-greek-underworld-afterlife-en',
    name: 'Greek Underworld & Afterlife — English (18)',
    categoryPath: ['trivia', 'mythology', 'greek-underworld'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'trivia-flight-aviation-history-en',
    name: 'Flight & Aviation History — English (16)',
    categoryPath: ['trivia', 'history', 'aviation'],
    language: 'en',
    lucky: 'default',
    separator: '|',
  },
  {
    id: 'trivia-car-engines-vehicle-engineering-en',
    name: 'Car Engines & Vehicle Engineering — English (20)',
    categoryPath: ['trivia', 'technology', 'vehicle-engineering'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'trivia-railway-engineering-world-railways-en',
    name: 'Railway Engineering & World Railways — English (23)',
    categoryPath: ['trivia', 'technology', 'railways'],
    language: 'en',
    lucky: 'default',
    separator: '|',
  },
  {
    id: 'trivia-bicycles-motorcycles-en',
    name: 'Bicycles and Motorcycles — English (16)',
    categoryPath: ['trivia', 'transport', 'bicycles-motorcycles'],
    language: 'en',
    lucky: 'default',
    separator: '|',
  },
  {
    id: 'trivia-ancient-civilizations-en',
    name: 'Ancient Civilizations: Mesopotamia and Egypt — English (22)',
    categoryPath: ['trivia', 'history', 'ancient-civilizations'],
    language: 'en',
    lucky: 'default',
    separator: '|',
  },
  {
    id: 'trivia-medieval-castles-tournaments-en',
    name: 'Medieval Castles and Tournaments — English (17)',
    categoryPath: ['trivia', 'history', 'medieval-castles'],
    language: 'en',
    lucky: 'default',
    separator: '|',
  },
  {
    id: 'trivia-invertebrates-body-plans-en',
    name: 'Invertebrates: Body Plans and Names — English (19)',
    categoryPath: ['trivia', 'science-nature', 'invertebrates'],
    language: 'en',
    lucky: 'default',
    separator: '|',
  },
  {
    id: 'trivia-world-cities-transit-landmarks-en',
    name: 'World Cities: Transit and Landmark Clues — English (22)',
    categoryPath: ['trivia', 'geography', 'cities'],
    language: 'en',
    lucky: 'default',
    separator: '|',
  },
  {
    id: 'trivia-literature-authors-characters-forms-en',
    name: 'Literature: Authors, Characters, and Forms — English (20)',
    categoryPath: ['trivia', 'arts', 'literature'],
    language: 'en',
    lucky: 'default',
    separator: '|',
  },
  {
    id: 'trivia-body-science-medical-history-imaging-en',
    name: 'Body Science: Medical History and Imaging — English (20)',
    categoryPath: ['trivia', 'science-nature', 'medical-history-imaging'],
    language: 'en',
    lucky: 'default',
    separator: '|',
  },
  {
    id: 'trivia-light-optics-telescopes-en',
    name: 'Light, Optics, and Telescopes — English (15)',
    categoryPath: ['trivia', 'science-nature', 'optics'],
    language: 'en',
    lucky: 'default',
    separator: '|',
  },

  {
    id: 'b00-animals',
    name: 'B00 Animals: Names, Anatomy & Behavior — English (48)',
    categoryPath: ['trivia', 'science-nature', 'animals'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'b00-arts-literature',
    name: 'B00 Arts, Literature & Media — English (36)',
    categoryPath: ['trivia', 'arts', 'arts-and-literature'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'b00-language-culture',
    name: 'B00 Language, Symbols & Cultural Ideas — English (15)',
    categoryPath: ['trivia', 'arts', 'language-and-traditions'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'b00-places-built-world',
    name: 'B00 Places, Buildings & Designed Structures — English (22)',
    categoryPath: ['trivia', 'history', 'places-and-structures'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'b00-science-technology',
    name: 'B00 Science, Technology & Transport — English (15)',
    categoryPath: ['trivia', 'science-nature'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'b01-africa-nature',
    name: 'B01 African Landscapes & Wildlife — English (35)',
    categoryPath: ['trivia', 'geography', 'africa'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'b01-asia-nature',
    name: 'B01 Asian Landscapes & Wildlife — English (29)',
    categoryPath: ['trivia', 'geography', 'asia'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'b01-europe-asia-culture',
    name: 'B01 European & Asian Culture, Architecture & Food — English (39)',
    categoryPath: ['trivia', 'arts', 'europe-and-asia'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'b01-europe-nature',
    name: 'B01 European Landscapes & Wildlife — English (34)',
    categoryPath: ['trivia', 'geography', 'europe'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'b01-habitats-wildlife',
    name: 'B01 Habitats, Biomes & Wildlife — English (27)',
    categoryPath: ['trivia', 'science-nature', 'ecology-and-animals'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'b01-north-america',
    name: 'B01 North American Landscapes, Cities & Wildlife — English (50)',
    categoryPath: ['trivia', 'geography', 'north-america'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'b01-oceania-world',
    name: 'B01 Oceania, Islands & Global Places — English (42)',
    categoryPath: ['trivia', 'geography', 'oceania-and-islands'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'b01-rocks-minerals',
    name: 'B01 Rocks, Minerals & Geological Materials — English (38)',
    categoryPath: ['trivia', 'science-nature', 'geology'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'b01-south-america-nature',
    name: 'B01 South American Landscapes & Wildlife — English (42)',
    categoryPath: ['trivia', 'geography', 'south-america'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'b01-space-earth',
    name: 'B01 Space & Earth Science Foundations — English (17)',
    categoryPath: ['trivia', 'science-nature', 'space-and-earth'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'b01-water-oceans',
    name: 'B01 Water, Oceans & Rivers — English (32)',
    categoryPath: ['trivia', 'science-nature', 'water'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'b01-world-cultures',
    name: 'B01 World Cultures, Traditions & Landmarks — English (30)',
    categoryPath: ['trivia', 'arts', 'traditions-and-landmarks'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'b04-abdomen-and-pelvis',
    name: 'Abdomen and Pelvis — English (44)',
    categoryPath: ['trivia', 'science-nature', 'abdomen-and-pelvis'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'b04-anatomy-glossary',
    name: 'Anatomy Glossary — English (17)',
    categoryPath: ['trivia', 'science-nature', 'glossary'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'b04-arms-and-hands',
    name: 'Arms and Hands — English (41)',
    categoryPath: ['trivia', 'science-nature', 'arms-and-hands'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'b04-body-basics',
    name: 'Body Basics — English (17)',
    categoryPath: ['trivia', 'science-nature', 'body-basics'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'b04-body-cover-and-muscles',
    name: 'Body Cover and Muscular System — English (41)',
    categoryPath: ['trivia', 'science-nature', 'body-cover-and-muscular-system'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'b04-body-systems-and-skin',
    name: 'Body Systems and Skin — English (21)',
    categoryPath: ['trivia', 'science-nature', 'body-systems-and-skin'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'b04-chest-and-back',
    name: 'Chest and Back — English (43)',
    categoryPath: ['trivia', 'science-nature', 'chest-and-back'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'b04-circulation-and-defence',
    name: 'Circulation and Defence — English (27)',
    categoryPath: ['trivia', 'science-nature', 'circulation-and-defence'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'b04-head-and-neck-1',
    name: 'Head and Neck: Skull, Face and Brain — English (27)',
    categoryPath: ['trivia', 'science-nature', 'head-and-neck'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'b04-head-and-neck-2',
    name: 'Head and Neck: Senses and Balance — English (27)',
    categoryPath: ['trivia', 'science-nature', 'head-and-neck'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'b04-legs-and-feet',
    name: 'Legs and Feet — English (28)',
    categoryPath: ['trivia', 'science-nature', 'legs-and-feet'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'b04-nervous-endocrine-development',
    name: 'Nervous, Endocrine and Development — English (29)',
    categoryPath: ['trivia', 'science-nature', 'nervous-endocrine-and-development'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'b04-respiratory-and-reproductive',
    name: 'Respiratory and Reproductive Systems — English (34)',
    categoryPath: ['trivia', 'science-nature', 'respiratory-and-reproductive-systems'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'b07-galaxies-cosmology',
    name: 'Galaxies & Cosmology — English (18)',
    categoryPath: ['trivia', 'science-nature', 'astronomy', 'galaxies-and-cosmology'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'b07-optics-sky-observing',
    name: 'Optical Principles & Sky Observing — English (38)',
    categoryPath: ['trivia', 'science-nature', 'astronomy', 'optical-principles-and-sky-observing'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'b07-planetary-inner-moon',
    name: 'Planetary Science: Inner Worlds, Earth, Moon & Eclipses — English (48)',
    categoryPath: ['trivia', 'science-nature', 'astronomy', 'planetary-science'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'b07-planetary-outer-small-bodies',
    name: 'Planetary Science: Mars, Giant Planets & Small Bodies — English (33)',
    categoryPath: ['trivia', 'science-nature', 'astronomy', 'planetary-science'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'b07-spaceflight-observatories',
    name: 'Spaceflight & Space Observatories — English (15)',
    categoryPath: ['trivia', 'science-nature', 'astronomy', 'spaceflight'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'b07-stellar-science',
    name: 'Stellar Science: Stars, Nebulae & Stellar Evolution — English (26)',
    categoryPath: ['trivia', 'science-nature', 'astronomy', 'stellar-science'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'b08-aviation-engineering-en',
    name: 'Aviation Engineering and Rotorcraft — English (23)',
    categoryPath: ['trivia', 'transport', 'aviation'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'b08-aviation-origins-history-en',
    name: 'Aviation Origins and History — English (19)',
    categoryPath: ['trivia', 'transport', 'aviation'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'b08-maritime-passenger-research-en',
    name: 'Maritime Passenger and Research Vessels — English (40)',
    categoryPath: ['trivia', 'transport', 'maritime'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'b08-maritime-traditions-en',
    name: 'Maritime Traditions and Transport — English (23)',
    categoryPath: ['trivia', 'transport', 'maritime'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'b08-spaceflight-technology-en',
    name: 'Spaceflight Technology — English (15)',
    categoryPath: ['trivia', 'technology', 'spaceflight'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'b08-specialized-ground-vehicles-en',
    name: 'Specialized Ground Vehicles — English (44)',
    categoryPath: ['trivia', 'transport', 'specialized-vehicles'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'b08-transport-foundations-en',
    name: 'Transport Foundations — English (31)',
    categoryPath: ['trivia', 'transport', 'general'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'b08-vehicle-engineering-en',
    name: 'Vehicle Engineering — English (41)',
    categoryPath: ['trivia', 'transport', 'vehicle-engineering'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'b09-animal-biology',
    name: 'Animal Biology: Body Plans and Adaptations — English (36)',
    categoryPath: ['trivia', 'science-nature', 'zoology'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'b09-astronomy-01',
    name: 'B09 Astronomy: Stars, Galaxies, and Solar Systems — English (30)',
    categoryPath: ['trivia', 'science-nature', 'astronomy'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'b09-astronomy-02',
    name: 'B09 Astronomy: Planets, Observation, and Exploration — English (24)',
    categoryPath: ['trivia', 'science-nature', 'astronomy'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'b09-chemistry-materials',
    name: 'Chemistry, Materials, and Matter — English (18)',
    categoryPath: ['trivia', 'science-nature', 'chemistry'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'b09-earth-01',
    name: 'B09 Earth Science: Interior, Tectonics, and Rocks — English (29)',
    categoryPath: ['trivia', 'science-nature', 'earth-science'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'b09-earth-02',
    name: 'B09 Earth Science: Weather, Water, and Oceans — English (22)',
    categoryPath: ['trivia', 'science-nature', 'earth-science'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'b09-human-biology',
    name: 'Human Biology: Body Systems and Genetics — English (39)',
    categoryPath: ['trivia', 'science-nature', 'human-biology'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'b09-space-transport-history',
    name: 'Spacecraft and Transport Technology History — English (21)',
    categoryPath: ['trivia', 'technology', 'spaceflight-and-transport'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'b10-animal-biology',
    name: 'Animal Biology: Diversity and Behavior — English (35)',
    categoryPath: ['trivia', 'science-nature', 'zoology'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'b10-chemistry-foundations',
    name: 'Chemistry Foundations: Atoms, Elements, and Materials — English (24)',
    categoryPath: ['trivia', 'science-nature', 'chemistry'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'b10-earth-geography',
    name: 'Earth Science and Physical Geography — English (20)',
    categoryPath: ['trivia', 'science-nature', 'earth-science'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'b10-human-biology',
    name: 'Human Biology: Systems and Senses — English (21)',
    categoryPath: ['trivia', 'science-nature', 'human-biology'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'b10-space-science-history',
    name: 'Space Science and Exploration History — English (27)',
    categoryPath: ['trivia', 'science-nature', 'astronomy-and-spaceflight'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'b11-botany-fungi',
    name: 'Botany and Fungi: Plant Structure and Partnerships — English (22)',
    categoryPath: ['trivia', 'science-nature', 'biology', 'botany-and-mycology'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'b11-environmental-science',
    name: 'Environmental Science: Habitats, Landscapes, and Weather — English (17)',
    categoryPath: ['trivia', 'science-nature', 'earth-and-environmental-science'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'b11-zoology',
    name: 'Zoology: Animal Diversity and Adaptations — English (23)',
    categoryPath: ['trivia', 'science-nature', 'biology', 'zoology'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'b12-americas',
    name: 'Mythologies of the Americas — English (36)',
    categoryPath: ['trivia', 'mythology', 'americas'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'b12-east-asian',
    name: 'East Asian Mythology: Chinese, Japanese, and Korean Traditions — English (31)',
    categoryPath: ['trivia', 'mythology', 'east-asian'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'b12-egyptian-african',
    name: 'Egyptian and African Mythologies — English (32)',
    categoryPath: ['trivia', 'mythology', 'egyptian-and-african'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'b12-greek-cosmology',
    name: 'Greek Mythology: Cosmos, Gods, and Origins — English (35)',
    categoryPath: ['trivia', 'mythology', 'greek'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'b12-greek-heroes-1',
    name: 'Greek Mythology: Heroes, Quests, and Genealogies I — English (32)',
    categoryPath: ['trivia', 'mythology', 'greek', 'heroes'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'b12-greek-heroes-2',
    name: 'Greek Mythology: Heroes, Quests, and Genealogies II — English (29)',
    categoryPath: ['trivia', 'mythology', 'greek', 'heroes'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'b12-mesopotamian',
    name: 'Mesopotamian Mythology: Gods, Epics, and Origins — English (18)',
    categoryPath: ['trivia', 'mythology', 'mesopotamian'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'b12-norse',
    name: 'Norse Mythology: Gods, Worlds, and Ragnarök — English (23)',
    categoryPath: ['trivia', 'mythology', 'norse'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'b12-northern-european',
    name: 'Northern European Mythology: Sagas and Folklore — English (34)',
    categoryPath: ['trivia', 'mythology', 'northern-european'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'b12-oceania',
    name: 'Oceania Mythologies: Ancestors, Spirits, and Heroes — English (18)',
    categoryPath: ['trivia', 'mythology', 'oceania'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'b12-roman',
    name: 'Roman Mythology: Gods, Legends, and Rituals — English (22)',
    categoryPath: ['trivia', 'mythology', 'roman'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'b12-south-asian',
    name: 'South Asian Mythology: Hindu, Buddhist, and Epic Traditions — English (24)',
    categoryPath: ['trivia', 'mythology', 'south-asian'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'b13-chemistry-matter',
    name: 'Chemistry: Matter and Materials — English (25)',
    categoryPath: ['trivia', 'science-nature', 'chemistry'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'b13-chemistry-reactions-materials',
    name: 'Chemistry: Reactions and Materials — English (45)',
    categoryPath: ['trivia', 'science-nature', 'chemistry'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'b13-chemistry-structure',
    name: 'Chemistry: Structure and Reactions — English (48)',
    categoryPath: ['trivia', 'science-nature', 'chemistry'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'b13-physics-forces-fields',
    name: 'Physics: Fields, Electricity, and Mechanics — English (47)',
    categoryPath: ['trivia', 'science-nature', 'physics'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'b13-physics-waves-optics',
    name: 'Physics and Optics: Energy, Waves, and Light — English (38)',
    categoryPath: ['trivia', 'science-nature', 'physics-and-optics'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'b14-b15-culture-traditions',
    name: 'Culture: Languages, Customs, Buildings, and Memorials — English (17)',
    categoryPath: ['trivia', 'arts', 'culture'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'b14-geography-landforms-places',
    name: 'Geography: Landforms, Places, and Cities — English (38)',
    categoryPath: ['trivia', 'science-nature', 'geography'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'b14-history-literacy-institutions',
    name: 'History: Literacy, Institutions, and Society — English (40)',
    categoryPath: ['trivia', 'arts', 'history'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'b14-history-war-medieval',
    name: 'History: War and Medieval Europe — English (38)',
    categoryPath: ['trivia', 'arts', 'history'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'b14-literature-arts',
    name: 'Literature and Arts: Forms, Creators, and Works — English (17)',
    categoryPath: ['trivia', 'arts', 'literature-and-arts'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'b15-geography-cities-landmarks',
    name: 'Geography and Cities: Countries, Landmarks, and Transport — English (46)',
    categoryPath: ['trivia', 'science-nature', 'geography', 'cities'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'b15-geography-earth-weather',
    name: 'Geography: Earth, Weather, and Natural Hazards — English (31)',
    categoryPath: ['trivia', 'science-nature', 'geography'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'life-evolution-fossils',
    name: 'Evolution, Fossils, and Prehistoric Life — English (21)',
    categoryPath: ['trivia', 'science-nature', 'life-science'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'plant-biology-adaptations',
    name: 'Plant Biology and Adaptations — English (22)',
    categoryPath: ['trivia', 'science-nature', 'biology'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'trivia-agriculture-environment-en',
    name: 'Environment: Agriculture, Resources & Pollution — English (45)',
    categoryPath: ['trivia', 'science-nature', 'environment'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'trivia-b06-botany-foundations-en',
    name: 'Botany Foundations — English (27)',
    categoryPath: ['trivia', 'science-nature', 'plants', 'botany'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'trivia-b06-crops-and-plant-uses-en',
    name: 'Crops and Plant Uses — English (36)',
    categoryPath: ['trivia', 'science-nature', 'plants', 'uses'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'trivia-b06-fungi-foundations-en',
    name: 'Fungi Foundations — English (35)',
    categoryPath: ['trivia', 'science-nature', 'fungi'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'trivia-b06-fungi-partnerships-en',
    name: 'Fungal Partnerships and Uses — English (41)',
    categoryPath: ['trivia', 'science-nature', 'fungi'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'trivia-b06-plant-adaptations-en',
    name: 'Plant Adaptations and Physiology — English (46)',
    categoryPath: ['trivia', 'science-nature', 'plants', 'adaptations'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'trivia-b06-plant-ecology-en',
    name: 'Plant Ecology and Ecosystems — English (36)',
    categoryPath: ['trivia', 'science-nature', 'ecology', 'plants'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'trivia-b06-plant-reproduction-en',
    name: 'Plant Reproduction and Dispersal — English (50)',
    categoryPath: ['trivia', 'science-nature', 'plants', 'reproduction'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'trivia-biomes-tundra-mountains-en',
    name: 'Ecology: Biomes, Tundra & Mountain Life — English (20)',
    categoryPath: ['trivia', 'science-nature', 'ecology'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'trivia-climate-systems-en',
    name: 'Climate Science: Seasons, Circulation & Climate Change — English (24)',
    categoryPath: ['trivia', 'science-nature', 'climate'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'trivia-deserts-wetlands-marine-life-en',
    name: 'Ecology: Deserts, Wetlands, Coasts & Marine Life — English (42)',
    categoryPath: ['trivia', 'science-nature', 'ecology'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'trivia-dinosaurs-fossils-anatomy-en',
    name: 'Dinosaurs & Fossils: Anatomy & Evidence — English (49)',
    categoryPath: ['trivia', 'science-nature', 'paleontology'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'trivia-dinosaurs-fossils-foundations-en',
    name: 'Dinosaurs & Fossils: Foundations — English (49)',
    categoryPath: ['trivia', 'science-nature', 'paleontology'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'trivia-dinosaurs-fossils-history-en',
    name: 'Dinosaurs & Fossils: History & Classification — English (48)',
    categoryPath: ['trivia', 'science-nature', 'paleontology'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'trivia-earth-history-planetary-science-en',
    name: 'Earth Science: Earth History & Planetary Science — English (41)',
    categoryPath: ['trivia', 'science-nature', 'earth-history'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'trivia-earth-interior-tectonics-en',
    name: 'Earth Science: Earth Interior & Tectonics — English (18)',
    categoryPath: ['trivia', 'science-nature', 'geology'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'trivia-earth-science-processes-en',
    name: 'Earth Science: Weathering, Erosion & Fossils — English (16)',
    categoryPath: ['trivia', 'science-nature', 'geology'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'trivia-ecosystems-conservation-en',
    name: 'Ecology: Ecosystems, Food Webs & Conservation — English (23)',
    categoryPath: ['trivia', 'science-nature', 'ecology'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'trivia-forests-grasslands-ecology-en',
    name: 'Ecology: Forests, Rainforests, Grasslands & Savannas — English (30)',
    categoryPath: ['trivia', 'science-nature', 'ecology'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'trivia-human-history-antiquity-rome-en',
    name: 'Human History: Greece, Persia & Rome — English (34)',
    categoryPath: ['trivia', 'history', 'human-history'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'trivia-human-history-asia-exploration-en',
    name: 'Human History: Asian Empires & Exploration — English (34)',
    categoryPath: ['trivia', 'history', 'human-history'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'trivia-human-history-contemporary-world-en',
    name: 'Human History: Decolonization & Contemporary World — English (34)',
    categoryPath: ['trivia', 'history', 'human-history'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'trivia-human-history-early-modern-en',
    name: 'Human History: Early Modern Worlds — English (34)',
    categoryPath: ['trivia', 'history', 'human-history'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'trivia-human-history-medieval-worlds-en',
    name: 'Human History: Medieval Worlds — English (34)',
    categoryPath: ['trivia', 'history', 'human-history'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'trivia-human-history-modernization-en',
    name: 'Human History: Modernization & Empire — English (34)',
    categoryPath: ['trivia', 'history', 'human-history'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'trivia-human-history-prehistory-antiquity-en',
    name: 'Human History: Prehistory & Antiquity — English (34)',
    categoryPath: ['trivia', 'history', 'human-history'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'trivia-human-history-revolutions-en',
    name: 'Human History: Revolutions & Nations — English (34)',
    categoryPath: ['trivia', 'history', 'human-history'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'trivia-human-history-rome-medieval-en',
    name: 'Human History: Rome & Medieval Worlds — English (34)',
    categoryPath: ['trivia', 'history', 'human-history'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'trivia-human-history-world-wars-en',
    name: 'Human History: World Wars & Their Aftermath — English (34)',
    categoryPath: ['trivia', 'history', 'human-history'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'trivia-rocks-minerals-ores-en',
    name: 'Earth Science: Rocks, Minerals & Ores — English (27)',
    categoryPath: ['trivia', 'science-nature', 'geology'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'trivia-volcanoes-geophysics-en',
    name: 'Earth Science: Geophysics & Volcanoes — English (16)',
    categoryPath: ['trivia', 'science-nature', 'geology'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'trivia-water-cycle-rivers-oceans-en',
    name: 'Water Landscapes: Water, Rivers, Glaciers & Oceans — English (28)',
    categoryPath: ['trivia', 'science-nature', 'water'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'trivia-weather-storms-floods-en',
    name: 'Weather & Storms: Fronts, Clouds, Floods & Fire Weather — English (32)',
    categoryPath: ['trivia', 'science-nature', 'weather'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
  {
    id: 'trivia-world-landscapes-geography-en',
    name: 'Earth Science: World Landscapes & Geography — English (48)',
    categoryPath: ['trivia', 'science-nature', 'geography'],
    language: 'en',
    lucky: 'category',
    separator: '|',
  },
];

export function getSampleGameUrl(game: SampleGame): string {
  const base = import.meta.env.BASE_URL;
  return `${base}sample_games/${game.id}.csv`;
}

export function getSampleGameParam(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get('sample_game');
}

export function findSampleGameById(id: string): SampleGame | undefined {
  return SAMPLE_GAMES.find((g) => g.id === id);
}

export function setSampleGameParam(game: SampleGame): void {
  const url = new URL(window.location.href);
  url.searchParams.set('sample_game', game.id);
  url.searchParams.set('lang', currentLocale.value);
  url.searchParams.delete('cards');
  window.history.replaceState(null, '', url.toString());
}

export function clearSampleGameParams(): void {
  const url = new URL(window.location.href);
  url.searchParams.set('lang', currentLocale.value);
  url.searchParams.delete('sample_game');
  url.searchParams.delete('cards');
  window.history.replaceState(null, '', url.toString());
}

export function isInCategory(game: SampleGame, path: string[]): boolean {
  return path.every((segment, index) => game.categoryPath[index] === segment);
}

export function getEligibleDecks(path: string[] | null, games = SAMPLE_GAMES): SampleGame[] {
  return games.filter(game => game.language === 'en' && game.lucky !== 'never' &&
    (path ? isInCategory(game, path) : game.lucky === 'default'));
}

export function pickLuckyDeck(path: string[] | null, games = SAMPLE_GAMES, random = Math.random): SampleGame | null {
  const eligible = getEligibleDecks(path, games);
  return eligible.length ? eligible[Math.floor(random() * eligible.length)] : null;
}

export function filterDecks(search: string, label: (segment: string) => string, games = SAMPLE_GAMES): SampleGame[] {
  const query = search.trim().toLocaleLowerCase();
  return games.filter(game => `${game.name} ${game.categoryPath.map(label).join(' / ')}`.toLocaleLowerCase().includes(query));
}

export interface DeckGroup {
  path: string[];
  children: Map<string, DeckGroup>;
  decks: SampleGame[];
}

export function groupDecks(games: SampleGame[]): DeckGroup {
  const root: DeckGroup = { path: [], children: new Map(), decks: [] };
  for (const game of games) {
    let group = root;
    for (const segment of game.categoryPath) {
      let child = group.children.get(segment);
      if (!child) {
        child = { path: [...group.path, segment], children: new Map(), decks: [] };
        group.children.set(segment, child);
      }
      group = child;
    }
    group.decks.push(game);
  }
  return root;
}

type SampleCardsResult = { ok: true; cards: FlashCard[] } | { ok: false; error: string };
type LuckyMixFailure = {
  ok: false;
  error: string;
  retryable: boolean;
};

export type LuckyMixProgress = {
  cards: number;
  decks: number;
  deck: SampleGame;
};

export type LuckyMixResult =
  | { ok: true; cards: FlashCard[]; source: MixedDeckSource }
  | LuckyMixFailure;

export function orderLuckyDecks(
  path: string[] | null,
  games = SAMPLE_GAMES,
  random = Math.random,
): SampleGame[] {
  const ordered = [...getEligibleDecks(path, games)];
  for (let index = ordered.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [ordered[index], ordered[other]] = [ordered[other], ordered[index]];
  }
  return ordered;
}

export async function buildLuckyMix(
  decks: SampleGame[],
  scope: string[] | null,
  onProgress?: (progress: LuckyMixProgress) => void,
  fetchCards: (game: SampleGame) => Promise<SampleCardsResult> = fetchSampleGameCards,
): Promise<LuckyMixResult> {
  const cards: FlashCard[] = [];
  const cardsByKey = new Map<string, FlashCard>();
  const origins = new Map<string, Set<string>>();
  const uniqueCardsByDeck = new Map<string, Set<string>>();
  const components: MixedDeckSource['decks'] = [];

  for (const game of decks) {
    const result = await fetchCards(game);
    if (!result.ok) return { ok: false, error: `${game.name}: ${result.error}`, retryable: true };

    const uniqueCards = uniqueCardsByDeck.get(game.id) ?? new Set<string>();
    uniqueCardsByDeck.set(game.id, uniqueCards);

    for (const card of result.cards) {
      uniqueCards.add(card.key);
      const existing = cardsByKey.get(card.key);
      if (existing && existing.value !== card.value) {
        return {
          ok: false,
          error: t('catalog', 'mixConflict', { question: card.key, first: existing.value, second: card.value }),
          retryable: true,
        };
      }
      if (existing) {
        origins.get(card.key)?.add(game.id);
      } else {
        cards.push(card);
        cardsByKey.set(card.key, card);
        origins.set(card.key, new Set([game.id]));
      }
    }
    components.push({ id: game.id, name: game.name, cardCount: uniqueCards.size });
    onProgress?.({ cards: cards.length, decks: components.length, deck: game });
    if (components.length >= 2 && cards.length >= 100) break;
  }

  if (components.length < 2 || cards.length < 100) {
    return {
      ok: false,
      error: t('catalog', 'mixInsufficient', { cards: cards.length, decks: components.length }),
      retryable: false,
    };
  }

  return {
    ok: true,
    cards,
    source: {
      kind: 'mix',
      name: t('catalog', 'mixName'),
      scope,
      decks: components,
      origins: Object.fromEntries([...origins.entries()].map(([key, ids]) => [key, [...ids]])),
    },
  };
}

// Fetching is deliberately side-effect free: manual callers validate their intent before saving.
export async function fetchSampleGameCards(game: SampleGame): Promise<SampleCardsResult> {
  try {
    const response = await fetch(getSampleGameUrl(game));
    if (!response.ok) return { ok: false, error: t('data', 'fetchError', { reason: `HTTP ${response.status}` }) };
    const cards = parseCsv(await response.text(), game.separator);
    if (!cards.length) return { ok: false, error: t('errors', 'emptyData') };
    return { ok: true, cards };
  } catch {
    return { ok: false, error: t('deck', 'failed') };
  }
}

export function commitSampleGame(game: SampleGame, cards: FlashCard[]): void {
  saveDictionary(cards);
  resetToIdle();
  dictionary.value = cards;
  deckSource.value = { cards, kind: 'sample', name: game.name, id: game.id };
  error.value = null;
}

export function commitLuckyMix(cards: FlashCard[], source: MixedDeckSource): void {
  saveDictionaryWithMixedSource(cards, source);
  resetToIdle();
  dictionary.value = cards;
  deckSource.value = { ...source, cards };
  error.value = null;
}

export async function loadSampleGame(game: SampleGame, canCommit: () => boolean = () => true): Promise<string | null> {
  const result = await fetchSampleGameCards(game);
  if (!result.ok) return result.error;
  if (!canCommit()) return t('catalog', 'changed');
  try {
    commitSampleGame(game, result.cards);
    return null;
  } catch {
    return t('deck', 'failed');
  }
}
