/**
 * Child-facing onboarding wording (Sinhala): one short instruction at a time.
 * Kept separate from parent wording; a future English dictionary should mirror this shape.
 * Proposed wording, pending review by Sinhala-medium Grade 1 teachers.
 */

const si = {
  common: {
    repeat: 'නැවත අහන්න',
    repeatShow: 'නැවත බලන්න',
    help: 'උදව්',
    done: 'ඉවරයි',
    next: 'ඊළඟට',
    skip: 'ඊළඟ එකට යමු',
    tapOrDrag: 'ඇදලා දාන්න, නැත්නම් එකක් තට්ටු කරලා ඊට පස්සේ තැන තට්ටු කරන්න.',
    selected: 'තෝරා ඇත',
    thanks: 'හොඳයි! ඊළඟ එකට යමු.',
    tryOnce: 'ඒක නෙවෙයි. පින්තූරයේ තියෙන එක හොයමු.',
  },

  welcome: {
    title: 'ආයුබෝවන්! අපි ගවේෂණයට යමු.',
    companion: 'ඔයාගේ යාළුවා තෝරන්න',
    world: 'ඔයා කැමති ලෝකය තෝරන්න',
    sound: 'ශබ්දය',
    soundGentle: 'මෘදු ශබ්දය',
    soundQuiet: 'නිහඬව',
    start: 'පටන් ගමු',
    chooseAll: 'කැමති එකක් තෝරන්න',
  },

  worlds: {
    nature_garden: 'මල් වත්ත',
    animal_friends: 'සත්ව යාළුවෝ',
    toy_room: 'සෙල්ලම් කාමරය',
  },

  calibration: {
    nature_garden: 'රතු කොළය ගහට දාන්න.',
    animal_friends: 'රතු ඇපල් ගෙඩිය අලියාට දෙන්න.',
    toy_room: 'රතු බෝලය පෙට්ටියට දාන්න.',
    success: 'නියමයි!',
  },

  count: {
    instruction: (n: number) => `ලේනාට පලතුරු ${n}ක් ඕනේ. පලතුරු ${n}ක් කූඩයට දාන්න.`,
    inBasket: (n: number) => `කූඩයේ: ${n}`,
    helpClarify: 'ගහේ පලතුරු එකින් එක කූඩයට දාන්න. ඉවර වුණාම "ඉවරයි" ඔබන්න.',
    helpCue: 'කූඩයේ තියෙන පලතුරු ඇඟිල්ලෙන් පෙන්නලා ගණන් කරන්න.',
    takeBack: 'අයින් කරන්න පලතුරක් තට්ටු කරන්න.',
  },

  matchNumeral: {
    instruction: 'මෙතන කාර් කීයක් තියෙනවද? හරි අංකය තෝරන්න.',
    help: 'කාර් එකින් එක ගණන් කරන්න.',
  },

  matchGroup: {
    instruction: (n: number) => `මේ අංකය ${n}. බ්ලොක් ${n}ක් තියෙන පෙට්ටිය තෝරන්න.`,
    help: 'එක් එක් පෙට්ටියේ බ්ලොක් ගණන් කරන්න.',
  },

  compare: {
    instruction: 'වැඩිපුර සතුන් ඉන්නේ කොයි පැත්තේද? ඒ පැත්ත තෝරන්න.',
    left: 'මේ පැත්ත',
    right: 'අර පැත්ත',
    helpClarify: 'සතුන් වැඩියෙන් ඉන්න පැත්ත තෝරන්න.',
    supportIntro: 'අපි එකට බලමු.',
    supportL1: 'වම් පැත්තේ සතෙක්ට දකුණු පැත්තේ සතෙක් යාළු කරමු.',
    supportL2: 'ඉරි බලන්න. යාළුවෙක් නැති සතුන් ඉන්නේ කොයි පැත්තේද?',
    supportL3: 'යාළුවෙක් නැති සතුන් ඉතුරු වෙන පැත්තේ වැඩිපුර සතුන් ඉන්නවා.',
    transferIntro: 'දැන් ඔයාම කරන්න!',
  },

  // Grade 2 (onboarding-v2). Proposed wording, pending review by Sinhala-medium Grade 2 teachers.
  placeValue: {
    build: (n: number) => `දහයේ කූරු සහ එකේ කැට යොදාගෙන ${n} හදන්න.`,
    ten: 'දහයේ කූර',
    one: 'එකේ කැටය',
    tray: 'තැටිය',
    takeBack: 'අයින් කරන්න තට්ටු කරන්න',
    helpClarify: 'එක කූරක 10ක් තියෙනවා. එක කැටයක 1ක් තියෙනවා.',
    helpCue: (tens: number, ones: number) => `දැන් තැටියේ: දහයේ කූරු ${tens}යි, එකේ කැට ${ones}යි.`,
    readBlocks: 'මේ කූරු සහ කැට වලින් පෙන්වන සංඛ්‍යාව කීයද? හරි අංකය තෝරන්න.',
    readHelp: 'කූරු දහය බැගින් ගණන් කරන්න. ඊට පස්සේ කැට එක බැගින් ගණන් කරන්න.',
    showNumber: (n: number) => `${n} පෙන්වන පින්තූරය තෝරන්න.`,
    showHelp: 'මුල් ඉලක්කම කූරු ගණනයි. දෙවෙනි ඉලක්කම කැට ගණනයි.',
  },
  add2: {
    blocks: 'කූරු සහ කැට ඔක්කොම එකතු කළොත් කීයද? හරි අංකය තෝරන්න.',
    sum: 'එකතුව කීයද? හරි පිළිතුර තෝරන්න.',
    helpClarify: 'මුලින් දහ එකතු කරන්න. ඊට පස්සේ එක එකතු කරන්න.',
    supportIntro: 'අපි එකට බලමු.',
    supportL1: 'දහ එකතු කරමු, ඊට පස්සේ එක එකතු කරමු.',
    supportL2: 'කූරු සහ කැට බලන්න. දහ කීයද? එක කීයද?',
    supportL3: (a: number, b: number) => {
      const tens = Math.floor(a / 10) * 10 + Math.floor(b / 10) * 10;
      const ones = (a % 10) + (b % 10);
      return `${Math.floor(a / 10) * 10} + ${Math.floor(b / 10) * 10} = ${tens}. ${a % 10} + ${b % 10} = ${ones}. ${tens} + ${ones} = ${tens + ones}.`;
    },
    transferIntro: 'දැන් ඔයාම කරන්න!',
  },

  // Grade 3 (onboarding-v2). Proposed wording, pending review by Sinhala-medium Grade 3 teachers.
  placeValue3: {
    build: (n: number) => `සියයේ පුවරු, දහයේ කූරු සහ එකේ කැට යොදාගෙන ${n} හදන්න.`,
    hundred: 'සියයේ පුවරුව',
    helpClarify: 'එක පුවරුවක 100ක් තියෙනවා. එක කූරක 10ක් තියෙනවා. එක කැටයක 1ක් තියෙනවා.',
    helpCue: (hundreds: number, tens: number, ones: number) =>
      `දැන් තැටියේ: සියයේ පුවරු ${hundreds}යි, දහයේ කූරු ${tens}යි, එකේ කැට ${ones}යි.`,
    readBlocks: 'මේ පුවරු, කූරු සහ කැට වලින් පෙන්වන සංඛ්‍යාව කීයද? හරි අංකය තෝරන්න.',
    readHelp: 'පුවරු සිය බැගින්, කූරු දහය බැගින්, කැට එක බැගින් ගණන් කරන්න.',
    showNumber: (n: number) => `${n} පෙන්වන පින්තූරය තෝරන්න.`,
    showHelp: 'මුල් ඉලක්කම පුවරු ගණනයි. මැද ඉලක්කම කූරු ගණනයි. අග ඉලක්කම කැට ගණනයි. 0 කියන්නේ කිසිවක් නැහැ.',
  },
  mult: {
    groups: 'හැම පිඟානකම අඹ එක සමානයි. අඹ ඔක්කොම කීයද? හරි අංකය තෝරන්න.',
    groupsHelp: 'පිඟන් කීයද? එක පිඟානක අඹ කීයද? පිඟානෙන් පිඟානට ගණන් කරන්න.',
    product: 'පිළිතුර කීයද? හරි පිළිතුර තෝරන්න.',
    helpClarify: 'ගුණ කිරීම කියන්නේ සමාන කාණ්ඩ එකතු කිරීම. කාණ්ඩ කීයද, එක කාණ්ඩයක කීයද කියලා බලන්න.',
    supportIntro: 'අපි එකට බලමු.',
    supportL1: (groups: number, each: number) => `${groups} × ${each} කියන්නේ ${each} බැගින් කාණ්ඩ ${groups}ක්.`,
    supportL2: 'කාණ්ඩ බලන්න. එක කාණ්ඩයක් බැගින් එකතු කරමින් ගණන් කරන්න.',
    supportL3: (groups: number, each: number) =>
      `${Array.from({ length: groups }, () => each).join(' + ')} = ${groups * each}. ඒ නිසා ${groups} × ${each} = ${groups * each}.`,
    transferIntro: 'දැන් ඔයාම කරන්න!',
  },

  // Grades 4–5 (onboarding-v2). Proposed wording, pending review by Sinhala-medium Grade 4–5 teachers.
  shade: {
    takeBack: 'පාට කළ කොටසක් ආයෙත් තට්ටු කළොත් පාට අයින් වෙනවා.',
    shaded: (n: number, total: number) => `පාට කළ කොටස්: ${total}න් ${n}`,
    part: (i: number) => `කොටස ${i}`,
  },
  fraction: {
    shade: 'මේ තීරුවේ 3/4ක් පාට කරන්න. කොටසක් තට්ටු කළාම පාට වෙනවා.',
    shadeHelp: 'තීරුවේ සමාන කොටස් 4ක් තියෙනවා. 3/4 කියන්නේ ඒ 4න් 3ක්.',
    shadeCue: (n: number) => `දැන් පාට කළ කොටස් ${n}යි. කොටස් 4න් 3ක් පාට වෙන්න ඕනේ.`,
    readStrip: 'තීරුවේ පාට කළ කොටස පෙන්වන භාගය කීයද? හරි භාගය තෝරන්න.',
    readHelp: 'පහළ අංකය මුළු සමාන කොටස් ගණනයි. උඩ අංකය පාට කළ කොටස් ගණනයි.',
    equivalent: '1/2ට සමාන ප්‍රමාණයක් පාට කළ තීරුව තෝරන්න.',
    equivalentHelp: 'හැම තීරුවම එකම දිගයි. 1/2 කියන්නේ තීරුවෙන් හරි බාගයක්.',
  },
  perimeter: {
    square: 'මේ හතරැස් වත්ත වටේට වැටක් ගහනවා. වැටේ ඒකක කෑලි කීයක් ඕනෙද? හරි අංකය තෝරන්න.',
    rectangle: 'මේ වත්ත වටේට වැටක් ගහනවා. වැටේ ඒකක කෑලි කීයක් ඕනෙද? හරි අංකය තෝරන්න.',
    helpClarify: 'වත්තේ ඇතුළ නෙවෙයි, වටේ තියෙන දාර ගණන් කරන්න.',
    supportIntro: 'අපි එකට බලමු.',
    supportL1: 'එක කොනකින් පටන් අරන් වටේට යමින් දාර එකින් එක ගණන් කරමු.',
    supportL2: 'දාරවල අංක බලන්න. අන්තිම අංකය කීයද?',
    supportL3: (w: number, h: number) => `${w} + ${h} + ${w} + ${h} = ${2 * (w + h)}. වැටට කෑලි ${2 * (w + h)}ක් ඕනේ.`,
    transferIntro: 'දැන් ඔයාම කරන්න!',
  },
  decimal: {
    shade: 'මේ තීරුවේ 0.6ක් පාට කරන්න. කොටසක් තට්ටු කළාම පාට වෙනවා.',
    shadeHelp: 'තීරුවේ සමාන කොටස් 10ක් තියෙනවා. එක කොටසක් 0.1යි. 0.6 කියන්නේ කොටස් 6ක්.',
    shadeCue: (n: number) => `දැන් පාට කළ කොටස් ${n}යි. ඒ කියන්නේ ${(n / 10).toFixed(1)}.`,
    readTiles: 'පාට කළ කොටස පෙන්වන දශම සංඛ්‍යාව කීයද? හරි එක තෝරන්න.',
    readHelp: 'තීරුවේ කොටස් 10ක් තියෙනවා. එක කොටසක් 0.1යි.',
    compare: 'ලොකු සංඛ්‍යාව කුමක්ද? ඒක තෝරන්න.',
    compareHelp: 'දශම තිතට පස්සේ තියෙන මුල් ඉලක්කම (දහයෙන් පංගු) මුලින් සසඳන්න.',
  },
  pattern: {
    towers: 'කුළුණු එකින් එක උස යනවා. ඊළඟ කුළුණේ කැට කීයක් තියෙයිද? හරි අංකය තෝරන්න.',
    towersHelp: 'එක කුළුණක ඉඳන් ඊළඟ කුළුණට කැට කීයක් එකතු වෙනවද බලන්න.',
    next: 'රටාවේ ඊළඟ සංඛ්‍යාව කීයද? හරි පිළිතුර තෝරන්න.',
    helpClarify: 'එක සංඛ්‍යාවක ඉඳන් ඊළඟ එකට කීයක් එකතු වෙනවද බලන්න.',
    supportIntro: 'අපි එකට බලමු.',
    supportL1: 'හැම පියවරකදීම එකම ගණනක් එකතු වෙනවා. ඒ ගණන හොයමු.',
    supportL2: 'පැනීම් බලන්න. හැම පැනීමකදීම +4 යි.',
    supportL3: (last: number, step: number) => `${last} + ${step} = ${last + step}. ඊළඟ සංඛ්‍යාව ${last + step}.`,
    transferIntro: 'දැන් ඔයාම කරන්න! මේකේ රීතිය වෙනස් වෙන්න පුළුවන්.',
  },

  ending: {
    title: 'ඔයා හරිම හොඳට ගවේෂණය කළා!',
    text: 'ස්තුතියි. දැන් උපාංගය අම්මාට හෝ තාත්තාට දෙන්න.',
    finish: 'අවසන් කරන්න',
    saving: 'සුරකිමින්...',
    error: 'සුරැකීමට නොහැකි විය. කරුණාකර නැවත උත්සාහ කරන්න.',
    retry: 'නැවත උත්සාහ කරන්න',
  },

  progress: (step: number, total: number) => `${total}න් ${step}`,
};

export type ChildDictionary = typeof si;
export const childText: ChildDictionary = si;
