import { Animal, Enclosure, Task, SpeciesScheduleTemplate } from '../types';
import { saveRecord } from '../lib/dbClient';

export type { SpeciesScheduleTemplate };

const TEMPLATES_STORAGE_KEY = 'feronia_species_schedule_templates';

export function getSavedSpeciesScheduleTemplates(): SpeciesScheduleTemplate[] {
  try {
    const raw = localStorage.getItem(TEMPLATES_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SpeciesScheduleTemplate[];
  } catch (err) {
    console.error('Failed to parse schedule templates:', err);
    return [];
  }
}

export function syncSpeciesScheduleTemplatesFromDb(dbTemplates: SpeciesScheduleTemplate[]): void {
  if (!Array.isArray(dbTemplates) || dbTemplates.length === 0) return;
  try {
    const current = getSavedSpeciesScheduleTemplates();
    const map = new Map<string, SpeciesScheduleTemplate>();
    current.forEach(t => map.set(`${t.cleanSpecies.toLowerCase()}_${t.ageStage}`, t));
    dbTemplates.forEach(t => {
      const key = `${(t.cleanSpecies || t.species || '').toLowerCase()}_${t.ageStage}`;
      if (!map.has(key) || (t.createdAt && (!map.get(key)!.createdAt || t.createdAt > map.get(key)!.createdAt))) {
        map.set(key, t);
      }
    });
    const merged = Array.from(map.values());
    localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(merged));
  } catch (err) {
    console.warn('Failed to merge schedule templates from DB:', err);
  }
}

export function saveSpeciesScheduleTemplate(template: SpeciesScheduleTemplate): void {
  try {
    const current = getSavedSpeciesScheduleTemplates();
    const cleanSpec = (template.cleanSpecies || template.species || '').split('(')[0].trim().toLowerCase();
    const existingIndex = current.findIndex(t => 
      (t.cleanSpecies || t.species || '').split('(')[0].trim().toLowerCase() === cleanSpec && 
      t.ageStage === template.ageStage
    );
    let updated: SpeciesScheduleTemplate[];
    if (existingIndex >= 0) {
      updated = [...current];
      updated[existingIndex] = { ...template, id: current[existingIndex].id || template.id };
    } else {
      updated = [template, ...current];
    }
    localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(updated));

    // Persist to database (Supabase & Firestore) for multi-device & server availability
    saveRecord('species_schedule_templates', template).catch(err => {
      console.warn('[careUtils] Failed to persist schedule template to database:', err);
    });
  } catch (err) {
    console.error('Failed to save schedule template:', err);
  }
}

export function getTemplateForSpeciesAndAge(
  speciesName: string, 
  dobString?: string,
  allAnimals?: Animal[],
  allTasks?: Task[]
): SpeciesScheduleTemplate | null {
  const cleanSpec = (speciesName || '').split('(')[0].trim().toLowerCase();
  const { stage } = getAnimalAgeStage(dobString);
  const allTemplates = getSavedSpeciesScheduleTemplates();

  // 1. Check explicitly saved templates matching exact species & age stage
  const exact = allTemplates.find(t => 
    t.cleanSpecies.toLowerCase() === cleanSpec && 
    (t.ageStage === stage || t.ageStage === 'All Ages')
  );
  if (exact) return exact;

  // 1.5. Check explicitly saved templates matching species name only
  const speciesMatchTemplate = allTemplates.find(t => 
    t.cleanSpecies.toLowerCase() === cleanSpec ||
    cleanSpec.includes(t.cleanSpecies.toLowerCase()) ||
    t.cleanSpecies.toLowerCase().includes(cleanSpec)
  );
  if (speciesMatchTemplate) return speciesMatchTemplate;

  // 2. Check existing animals in database matching this species (exact stage first, then any stage)
  if (allAnimals && allAnimals.length > 0 && allTasks && allTasks.length > 0) {
    let matchingAnimals = allAnimals.filter(a => 
      !a.isArchived &&
      ((a.species || '').split('(')[0].trim().toLowerCase() === cleanSpec ||
       cleanSpec.includes((a.species || '').split('(')[0].trim().toLowerCase()) ||
       (a.species || '').split('(')[0].trim().toLowerCase().includes(cleanSpec)) &&
      getAnimalAgeStage(a.dob).stage === stage
    );

    if (matchingAnimals.length === 0) {
      matchingAnimals = allAnimals.filter(a => 
        !a.isArchived &&
        ((a.species || '').split('(')[0].trim().toLowerCase() === cleanSpec ||
         cleanSpec.includes((a.species || '').split('(')[0].trim().toLowerCase()) ||
         (a.species || '').split('(')[0].trim().toLowerCase().includes(cleanSpec))
      );
    }

    for (const matchingAnimal of matchingAnimals) {
      const animalTasks = allTasks.filter(t => t.animalId === matchingAnimal.id);
      const feedingTask = animalTasks.find(t => t.type === 'Feeding' || t.title.toLowerCase().includes('feed'));
      const careTask = animalTasks.find(t => t.type !== 'Feeding' && (t.type === 'Cleaning' || t.type === 'Water Change' || (t.type as string) === 'Care' || (t.type as string) === 'Maintenance' || t.title.toLowerCase().includes('care') || t.title.toLowerCase().includes('clean')));

      if (feedingTask || careTask) {
        let foodItemName = '';
        let feedingMethod = '';
        let feedingFreq = '';
        let feedingQuantity = '';
        let feedingTime = '';
        let feedingNotes = '';
        let careTaskName = '';
        let careFreq = '';
        let careTime = '';
        let careNotes = '';

        if (feedingTask) {
          const parsed = parseTaskDetailsString(feedingTask.details);
          foodItemName = parsed.food || feedingTask.title.replace(/^Feed\s*/i, '').replace(/^Scheduled Feeding:\s*/i, '').trim();
          feedingMethod = parsed.method || 'Standard Method';
          feedingFreq = feedingTask.frequency || 'Daily';
          feedingQuantity = parsed.quantity || '1 portion';
          feedingTime = feedingTask.time || '08:00 AM';
          feedingNotes = parsed.notes || 'Reused from existing ' + matchingAnimal.species + ' schedule';
        }

        if (careTask) {
          const parsed = parseTaskDetailsString(careTask.details);
          careTaskName = parsed.routine || careTask.title;
          careFreq = careTask.frequency || 'Daily';
          careTime = careTask.time || '09:00 AM';
          careNotes = parsed.notes || careTask.details || 'Reused from existing ' + matchingAnimal.species + ' care schedule';
        }

        return {
          id: `TMPL-LIVE-${matchingAnimal.id}`,
          species: matchingAnimal.species,
          cleanSpecies: cleanSpec,
          ageStage: stage,
          title: `${matchingAnimal.species} (${stage}) Recycled Animal Schedule`,
          scheduleType: feedingTask && careTask ? 'both' : feedingTask ? 'feeding' : 'care',
          foodItemName,
          feedingMethod,
          feedingFreq,
          feedingQuantity,
          feedingTime,
          feedingNotes,
          careTaskName,
          careFreq,
          careTime,
          careNotes,
          createdAt: new Date().toISOString(),
          isDefaultForSpeciesAge: true
        };
      }
    }
  }

  // 3. Fallback to partial species match from saved templates
  const partial = allTemplates.find(t => 
    cleanSpec.includes(t.cleanSpecies.toLowerCase()) || 
    t.cleanSpecies.toLowerCase().includes(cleanSpec)
  );
  return partial || null;
}

export interface UnifiedAnimalCare {
  feeding: string;
  feedingDetails?: string;
  feedingTime?: string;
  assignedKeeperName?: string;
  enrichment: string;
  temperature: string;
  humidity: string;
  habitat: string;
  careRoutine: string;
  careTime?: string;
  careNotes?: string;
  hasCustomSchedule: boolean;
  sourceLabel: string;
}

// Age Stage Calculator
export function getAnimalAgeStage(dobString?: string): { stage: 'Hatchling / Baby' | 'Juvenile / Sub-Adult' | 'Adult'; ageMonths: number } {
  if (!dobString) return { stage: 'Adult', ageMonths: 24 };
  const birth = new Date(dobString);
  if (isNaN(birth.getTime())) return { stage: 'Adult', ageMonths: 24 };
  const today = new Date();
  const diffMs = Math.max(0, today.getTime() - birth.getTime());
  const ageDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const ageMonths = ageDays / 30.4375;

  if (ageMonths < 6) {
    return { stage: 'Hatchling / Baby', ageMonths };
  } else if (ageMonths < 18) {
    return { stage: 'Juvenile / Sub-Adult', ageMonths };
  } else {
    return { stage: 'Adult', ageMonths };
  }
}

// Recommended Feeding & Care Presets (matching Admin schedule defaults)
export function getRecommendedFeedingAndCare(
  speciesName: string, 
  dobString?: string,
  allAnimals?: Animal[],
  allTasks?: Task[]
) {
  const cleanSpecies = (speciesName || 'Reptile').split('(')[0].trim();
  const { stage } = getAnimalAgeStage(dobString);

  let foodItemName = 'Live Insects / Greens';
  let feedingMethod = 'Live Feed';
  let feedingFreq = 'Every 2 days';
  let feedingQuantity = '1 portion';
  let feedingNotes = 'Adjust portion based on animal size and appetite.';
  let careTaskName = 'Health & Physical Examination';
  let careFreq = 'Every 1 day';
  let careNotes = 'Check enclosure environment, clean waste, and verify water supply.';
  let temperature = '85°F – 90°F (Basking 95°F)';
  let humidity = '40% – 50%';
  let habitat = 'Standard reptile enclosure with hide box and water bowl';
  let enrichment = 'Climbing branches, thermal gradient exploration';

  if (cleanSpecies.toLowerCase().includes('bearded dragon')) {
    temperature = '80°F – 85°F (Basking 100°F – 105°F)';
    humidity = '30% – 40%';
    habitat = 'Arid vivarium with slate basking tile and low humidity';
    enrichment = 'Elevated basking platforms, hammocks, foraging dish';

    if (stage === 'Hatchling / Baby') {
      foodItemName = 'Small Dubia Roaches & Daily Salad';
      feedingMethod = 'Live Insects & Salad Bowl';
      feedingFreq = 'Daily (Morning)';
      feedingQuantity = '10-15 small roaches + fresh greens';
      feedingNotes = 'Dust with Calcium + D3 5x/week. Fresh leafy greens daily.';
      careTaskName = 'Daily Habitat Misting & Temp Verification';
      careFreq = 'Daily';
      careNotes = 'Verify basking spot temp (105°F-110°F), mist lightly for hydration.';
    } else if (stage === 'Juvenile / Sub-Adult') {
      foodItemName = 'Medium Dubia Roaches / Mealworms & Salad';
      feedingMethod = 'Bowl Feed & Tongs';
      feedingFreq = 'Every 2 days';
      feedingQuantity = '8-12 medium roaches + fresh salad';
      feedingNotes = 'Insects every 2 days; fresh greens daily. Calcium dust 3x/week.';
      careTaskName = 'Habitat Misting, Basking & Spot Clean';
      careFreq = 'Daily';
      careNotes = 'Check basking spot temp (100°F-105°F), refill clean water dish, spot clean.';
    } else {
      foodItemName = 'Fresh Collard/Mustard Greens & Large Roaches';
      feedingMethod = 'Salad Bowl & Live Feed';
      feedingFreq = 'Salad Daily, Insects 2x/week';
      feedingQuantity = '1 bowl fresh greens + 5-8 roaches';
      feedingNotes = '80% greens diet for adults. Dust calcium twice a week.';
      careTaskName = 'Weekly Deep Sanitation & Daily Spot Clean';
      careFreq = 'Daily';
      careNotes = 'Clean basking tiles, remove waste immediately, verify 95-100°F basking temp.';
    }
  } else if (cleanSpecies.toLowerCase().includes('ball python')) {
    temperature = '78°F – 82°F (Warm side 88°F – 92°F)';
    humidity = '60% – 70% (75% during shed)';
    habitat = 'Enclosure with secure locking lid, dual hides, deep moisture-retentive substrate';
    enrichment = 'Sturdy branches, hollow cork bark tubes, humidity hide';

    if (stage === 'Hatchling / Baby') {
      foodItemName = 'Rat Pup / Hopper Mouse (10-15g)';
      feedingMethod = 'Thawed / Frozen-Thawed Tongs';
      feedingFreq = 'Every 5 days';
      feedingQuantity = '1 appropriate prey item (10-15% body weight)';
      feedingNotes = 'Warm prey to 100°F. Do not handle for 48 hours after feeding.';
      careTaskName = 'Humidity & Substrate Moisture Check';
      careFreq = 'Daily';
      careNotes = 'Inspect humidity (min 60%), mist enclosure, inspect for proper shedding.';
    } else if (stage === 'Juvenile / Sub-Adult') {
      foodItemName = 'Weaned Rat / Small Rat (30-50g)';
      feedingMethod = 'Thawed / Frozen-Thawed Tongs';
      feedingFreq = 'Every 7 days';
      feedingQuantity = '1 prey item matching widest body girth';
      feedingNotes = 'Feed in enclosure or quiet container. Do not handle 48 hrs post feeding.';
      careTaskName = 'Water Dish Refresh & Enclosure Spot Clean';
      careFreq = 'Daily';
      careNotes = 'Replace drinking water with fresh dechlorinated water, spot clean waste.';
    } else {
      foodItemName = 'Medium Rat (80-120g)';
      feedingMethod = 'Thawed / Frozen-Thawed Tongs';
      feedingFreq = 'Every 10–14 days';
      feedingQuantity = '1 medium rat (100g)';
      feedingNotes = 'Offer warmed frozen-thawed rat in evening. Monitor weight quarterly.';
      careTaskName = 'Bi-Weekly Substrate Turn & Health Screen';
      careFreq = 'Every 2 days';
      careNotes = 'Check cloaca, scale integrity, respiratory sound check, and water clean.';
    }
  } else if (cleanSpecies.toLowerCase().includes('gecko')) {
    temperature = '75°F – 80°F (Warm side 88°F – 90°F)';
    humidity = '30% – 40% (Humid hide 70%+)';
    habitat = 'Low terrestrial vivarium with humid hide box and calcium dish';
    enrichment = 'Rock caves, multi-level slates, shallow climbing ramps';
    foodItemName = 'Calcium-Dusted Mealworms & Crickets';
    feedingMethod = 'Live Feed Bowl / Tongs';
    feedingFreq = stage === 'Adult' ? 'Every 2-3 days' : 'Every 1 day';
    feedingQuantity = '6-10 dusted mealworms/crickets';
    feedingNotes = 'Leave dish of pure calcium carbonate in enclosure at all times.';
    careTaskName = 'Humid Hide Moistening & Spot Clean';
    careFreq = 'Daily';
    careNotes = 'Moisten sphagnum moss in humid hide, refresh water dish, spot clean.';
  } else if (cleanSpecies.toLowerCase().includes('tortoise') || cleanSpecies.toLowerCase().includes('turtle')) {
    temperature = '75°F – 85°F (Basking 95°F)';
    humidity = '50% – 70%';
    habitat = 'Large open-topped tortoise table or outdoor pen with deep soil/coco-coir substrate';
    enrichment = 'Edible grazing greens, shallow soaking pool, sun basking rocks';
    foodItemName = 'Fresh Grass Hay, Weeds & Calcium Supplement';
    feedingMethod = 'Slate Feeding Tile';
    feedingFreq = 'Daily';
    feedingQuantity = 'Pile sized to carapace';
    feedingNotes = 'High-fiber, low-protein diet. Calcium powder with D3 dusted 2x/week.';
    careTaskName = 'Daily Soak & Carapace Inspection';
    careFreq = 'Daily';
    careNotes = 'Lukewarm soak for 15-20 minutes, check scute integrity and hydration.';
  }

  // Check if a saved recyclable template exists for this species and age stage
  const savedTemplate = getTemplateForSpeciesAndAge(speciesName, dobString, allAnimals, allTasks);
  if (savedTemplate) {
    if (savedTemplate.foodItemName) foodItemName = savedTemplate.foodItemName;
    if (savedTemplate.feedingMethod) feedingMethod = savedTemplate.feedingMethod;
    if (savedTemplate.feedingFreq) feedingFreq = savedTemplate.feedingFreq;
    if (savedTemplate.feedingQuantity) feedingQuantity = savedTemplate.feedingQuantity;
    if (savedTemplate.feedingNotes) feedingNotes = savedTemplate.feedingNotes;
    if (savedTemplate.careTaskName) careTaskName = savedTemplate.careTaskName;
    if (savedTemplate.careFreq) careFreq = savedTemplate.careFreq;
    if (savedTemplate.careNotes) careNotes = savedTemplate.careNotes;
  }

  return {
    foodItemName,
    feedingMethod,
    feedingFreq,
    feedingTime: savedTemplate?.feedingTime || '08:00 AM',
    feedingQuantity,
    feedingNotes,
    careTaskName,
    careFreq,
    careTime: savedTemplate?.careTime || '09:00 AM',
    careNotes,
    temperature,
    humidity,
    habitat,
    enrichment,
    cleanSpecies,
    stage,
    isRecycledCustomTemplate: Boolean(savedTemplate),
    templateTitle: savedTemplate?.title
  };
}

// Parse task details string (Food:, Method:, Routine:, Notes:)
function parseTaskDetailsString(detailsStr?: string): Record<string, string> {
  if (!detailsStr) return {};
  const lines = detailsStr.split('\n');
  const res: Record<string, string> = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('Food:')) res.food = trimmed.replace(/^Food:\s*/, '').trim();
    else if (trimmed.startsWith('Method:')) res.method = trimmed.replace(/^Method:\s*/, '').trim();
    else if (trimmed.startsWith('Quantity:')) res.quantity = trimmed.replace(/^Quantity:\s*/, '').trim();
    else if (trimmed.startsWith('Routine:')) res.routine = trimmed.replace(/^Routine:\s*/, '').trim();
    else if (trimmed.startsWith('Notes:')) res.notes = trimmed.replace(/^Notes:\s*/, '').trim();
    else if (trimmed.startsWith('Supply:')) res.supply = trimmed.replace(/^Supply:\s*/, '').trim();
  }
  return res;
}

// Unify Care Requirements based on Inputs from Admin / Keeper roles
export function getUnifiedAnimalCare(
  animal: Animal,
  enclosure?: Enclosure,
  tasks?: Task[]
): UnifiedAnimalCare {
  const rec = getRecommendedFeedingAndCare(animal.species, animal.dob, undefined, tasks);

  // Check if Admin/Keeper created Feeding tasks for this animal
  const animalTasks = (tasks || []).filter(t => t.animalId === animal.id);
  const feedingTask = animalTasks.find(t => t.type === 'Feeding' || t.title.toLowerCase().includes('feed'));
  const careTask = animalTasks.find(t => t.type !== 'Feeding' && (t.type === 'Cleaning' || t.type === 'Water Change' || (t.type as string) === 'Care' || (t.type as string) === 'Maintenance' || t.title.toLowerCase().includes('care') || t.title.toLowerCase().includes('clean')));

  let feeding = 'No Feeding Task Scheduled';
  let feedingDetails = 'No feeding schedule configured for this animal yet.';
  let feedingTime = undefined;
  let careRoutine = 'No Care Routine Scheduled';
  let careTime = undefined;
  let careNotes = 'No care routine configured for this animal yet.';
  let assignedKeeperName = animal.assignedKeeperName;
  let hasCustomSchedule = false;

  if (feedingTask) {
    hasCustomSchedule = true;
    const parsed = parseTaskDetailsString(feedingTask.details);
    const item = parsed.food || feedingTask.title;
    const freq = feedingTask.frequency || rec.feedingFreq;
    const method = parsed.method ? ` • ${parsed.method}` : '';
    const notes = parsed.notes ? ` Notes: ${parsed.notes}` : '';
    feeding = `${item} (${freq})`;
    feedingDetails = `${feedingTask.title}${method}.${notes}`;
    if (feedingTask.time) feedingTime = feedingTask.time;
    if (feedingTask.assignedKeeperName) assignedKeeperName = feedingTask.assignedKeeperName;
  }

  if (careTask) {
    hasCustomSchedule = true;
    const parsed = parseTaskDetailsString(careTask.details);
    careRoutine = `${careTask.title} (${careTask.frequency || 'Scheduled'})`;
    careNotes = parsed.notes || careTask.details || rec.careNotes;
    if (careTask.time) careTime = careTask.time;
    if (!assignedKeeperName && careTask.assignedKeeperName) assignedKeeperName = careTask.assignedKeeperName;
  }

  // Enclosure Environmental Parameters (Input from Enclosure Manager by Admin/Keeper)
  const temperature = enclosure?.temperature || rec.temperature;
  const humidity = enclosure?.humidity || rec.humidity;
  const habitat = enclosure 
    ? `${enclosure.facility} • ${enclosure.name} (${enclosure.type})${enclosure.notes ? ` — ${enclosure.notes}` : ''}`
    : rec.habitat;

  const enrichment = rec.enrichment;

  return {
    feeding,
    feedingDetails,
    feedingTime,
    assignedKeeperName,
    enrichment,
    temperature,
    humidity,
    habitat,
    careRoutine,
    careTime,
    careNotes,
    hasCustomSchedule,
    sourceLabel: hasCustomSchedule || enclosure 
      ? 'Configured by Admin & Keeper Staff' 
      : 'Species Standard Protocol'
  };
}
