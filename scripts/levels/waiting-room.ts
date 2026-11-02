// Builds levels/test/waiting-room.json: the prototype room (docs/reference/prototype.html)
// as level data, split into three chapters in the same room, with Pino added. This is a
// test fixture, not a secret level. Run `npm run fixtures` after editing.
//
// Each chapter has its own copy of the room (ids must be unique), but all copies draw from
// the same flags, so the room looks continuous.
import type { Beat, Chapter, Cond, DogMoment, Effect, Hotspot, Level, Objective, Puzzle, Room, View } from '../../src/engine/schema.ts'

type Ch = 1 | 2 | 3
type Layer = View['layers'][number]

const F = (flag: string): Cond => ({ op: 'flag', flag })
const NOT = (cond: Cond): Cond => ({ op: 'not', cond })
const ALL = (...conds: Cond[]): Cond => ({ op: 'all', conds })
const ANY = (...conds: Cond[]): Cond => ({ op: 'any', conds })
const HAS = (item: string): Cond => ({ op: 'has', item })
const SEL = (item: string): Cond => ({ op: 'selected', item })
const say = (text: string): Effect => ({ do: 'say', text })
const set = (flag: string, value: boolean | number | string = true): Effect => ({ do: 'setFlag', flag, value })
const give = (item: string): Effect => ({ do: 'give', item })
const take = (item: string): Effect => ({ do: 'take', item })
const sound = (sfx: Extract<Effect, { do: 'sound' }>['sfx']): Effect => ({ do: 'sound', sfx })
const open = (view: string): Effect => ({ do: 'open', view })
const layer = (asset: string, params: Layer['params'] = {}, visibleWhen?: Cond, id?: string): Layer => ({
  ...(id ? { id } : {}),
  asset,
  ...(params && Object.keys(params).length ? { params } : {}),
  ...(visibleWhen ? { visibleWhen } : {}),
})
const spot = (id: string, rect: Hotspot['rect'], rules: Hotspot['rules'], extra: Partial<Hotspot> = {}): Hotspot => ({ id, rect, ...extra, rules })
const view = (layers: Layer[], hotspots: Hotspot[], puzzle?: string): View => ({ layers, hotspots, ...(puzzle ? { puzzle } : {}) })

const LIT = 'candle'
const lights = (cx = 400, cy = 270) => layer('lighting', { litFlag: LIT, cx, cy })
const CLOCK = { puzzle: 'clock', h: 3, m: 45 }
const faceFlags = { litFlag: LIT, tiltFlag: 'wound', untiltFlag: 'doorOpen', missingEyeFlag: 'eyeGone' }

function room(ch: Ch): Room {
  const id = (s: string) => `${s}${ch}`
  const r = id('room')

  const doorRules: Hotspot['rules'] =
    ch < 3
      ? [{ do: [say('The door won’t open. There’s a dial lock, and a keyhole under it.')] }]
      : [
          { when: F('unlocked'), do: [say('The door is open a crack. It’s very dark out there. You don’t want to go first.')] },
          { when: SEL('brassKey'), do: [open(id('lock')), take('brassKey'), set('keyIn'), sound('unlock')] },
          { do: [open(id('lock'))] },
        ]

  const walls: Room['walls'] = {
    n: view(
      [
        layer('roomShell'),
        layer('portrait', faceFlags),
        layer('door', { litFlag: LIT, keyFlag: 'keyIn', openFlag: 'doorOpen', feetFlag: 'feet', feetGoneFlag: 'feetGone' }),
        layer('caseClock', { ...CLOCK, woundFlag: 'wound', caseOpenFlag: 'timeSet', cuttersGoneFlag: 'cuttersGone' }),
        lights(),
      ],
      [
        spot(id('portrait'), [100, 120, 160, 200], [{ do: [open(id('portraitC'))] }]),
        spot(id('door'), [322, 142, 190, 312], doorRules, { accepts: ch === 3 ? ['brassKey', 'dog'] : [] }),
        spot(id('clock'), [575, 150, 90, 96], [
          { when: SEL('birdKey'), do: [open(id('clockC')), take('birdKey'), set('wound'), sound('click'), say('You wind it. The clock starts ticking, very loudly.')] },
          { do: [open(id('clockC'))] },
        ], { accepts: ['birdKey'] }),
        spot(id('case'), [588, 246, 66, 140], [
          { when: ALL(F('timeSet'), NOT(F('cuttersGone'))), do: [give('cutters'), set('cuttersGone'), say('Tiny clockmaker’s cutters, hidden behind the pendulum.')] },
          { when: F('cuttersGone'), do: [say('Just the pendulum now, swinging.')] },
          { do: [say('The pendulum case is shut tight. There’s no keyhole, only a tiny catch inside.')] },
        ]),
      ],
    ),
    e: view(
      [
        layer('roomShell'),
        layer('coatOnHook', { movedFlag: 'coatMoved', sandFlag: 'sand' }),
        layer('desk', { drawerOpenFlag: 'drawerOpen' }),
        layer('note'),
        layer('candle', { litFlag: LIT }),
        lights(490, 300),
      ],
      [
        spot(id('coat'), [95, 150, 115, 280], [{ do: [open(id('coatC'))] }], { visibleWhen: NOT(F('coatMoved')) }),
        spot(id('coatMoved'), [615, 150, 115, 280], [{ do: [open(id('coatC'))] }], { visibleWhen: F('coatMoved') }),
        spot(id('note'), [262, 326, 90, 34], [
          { do: [say('“If you’re reading this, the candle has gone out again. Don’t trust the window.”'), say('“Whatever is written on the glass was written from the outside.”')] },
        ], { looksLikeClue: true }),
        spot(id('drawer'), [330, 370, 140, 62], [
          { when: SEL('ironKey'), do: [open(id('drawerC')), take('ironKey'), set('drawerOpen'), sound('unlock')] },
          { do: [open(id('drawerC'))] },
        ], { accepts: ['ironKey'] }),
        spot(id('candle'), [462, 260, 56, 100], [
          { when: F(LIT), do: [say('It burns, but it doesn’t get any shorter.')] },
          { when: SEL('litMatch'), do: [take('litMatch'), set(LIT), sound('strike')] },
          { do: [say('A candle. The wick is still warm, as if someone just blew it out.')] },
        ], { accepts: ['litMatch'] }),
      ],
    ),
    s: view(
      [layer('roomShell'), layer('rug'), layer('bookshelf', { glintFlag: 'keyUnder' }), layer('birdcage', { keyGoneFlag: 'cageOpen', openFlag: 'cageOpen' }), lights()],
      [
        spot(id('book'), [286, 192, 50, 80], [{ do: [open(id('bookC'))] }]),
        spot(id('cage'), [530, 130, 140, 190], [{ do: [open(id('cageC'))] }]),
        spot(id('gap'), [146, 452, 268, 30], [{ do: [open(id('underC'))] }], { visibleWhen: F('keyUnder') }),
      ],
    ),
    w: view(
      [layer('roomShell'), layer('curtainedWindow', { litFlag: LIT }), layer('plantPot', { stringGoneFlag: 'stringGone' }), lights()],
      [
        spot(id('window'), [290, 110, 220, 240], [{ do: [open(id('windowC'))] }]),
        spot(id('pot'), [150, 290, 140, 185], [{ do: [open(id('potC'))] }]),
      ],
    ),
  }

  const closeUps: Room['closeUps'] = {
    [id('clockC')]: view(
      [layer('clockFaceClose', { ...CLOCK, woundFlag: 'wound', motto: 'Haste is for the living' }), lights()],
      [
        spot(id('clockFace'), [188, 78, 424, 424], [
          { when: SEL('birdKey'), do: [take('birdKey'), set('wound'), sound('click'), say('You wind it. The clock starts ticking, very loudly.')] },
          { when: NOT(F('wound')), do: [say('Stopped at quarter to four. There are two winding holes, but nothing to wind it with.')] },
          { when: NOT(F('timeSet')), do: [say('It’s ticking now. The hands can be turned from the winding holes.')] },
          { do: [say('Quarter past nine. It keeps ticking, but the hands don’t move on.')] },
        ], { accepts: ['birdKey'] }),
      ],
      ch === 2 ? 'clock' : undefined,
    ),
    [id('portraitC')]: view(
      [layer('portraitClose', { ...faceFlags, plaque: 'Eleanor, who waited' }, undefined, id('portraitFace')), lights()],
      [
        spot(id('face'), [230, 50, 340, 480], [
          { when: ALL(NOT(F(LIT)), F('wound')), do: [say('Her head has turned towards the clock. Her eyes are still painted shut.')] },
          { when: NOT(F(LIT)), do: [say('Eleanor. Her eyes are painted shut.')] },
          { when: F('eyeGone'), do: [say('One empty socket. She doesn’t seem to mind.')] },
          { do: [say('Her eyes are open now. One of them catches the light oddly.')] },
        ]),
        spot(id('takeEye'), [368, 241, 48, 36], [{ do: [give('glassEye'), set('eyeGone'), say('Her left eye comes loose with a soft click. It’s glass.')] }], {
          visibleWhen: ALL(F(LIT), NOT(F('eyeGone'))),
        }),
      ],
    ),
    [id('drawerC')]: view(
      [layer('drawerClosedClose', {}, NOT(F('drawerOpen'))), layer('drawerOpenClose', { matchboxGoneFlag: 'matchboxGone', litFlag: LIT }, F('drawerOpen')), lights()],
      [
        spot(id('drawerFront'), [150, 180, 500, 220], [
          { when: SEL('ironKey'), do: [take('ironKey'), set('drawerOpen'), sound('unlock')] },
          { do: [say('Locked. The keyhole is very small.')] },
        ], { accepts: ['ironKey'], visibleWhen: NOT(F('drawerOpen')) }),
        spot(id('photo'), [190, 190, 195, 155], [{ do: [set('photoSeen'), open(id('photoC'))] }], { visibleWhen: F('drawerOpen') }),
        spot(id('matchbox'), [460, 320, 130, 95], [{ do: [give('matchbox'), set('matchboxGone'), say('An empty matchbox. The striking strip is still rough.')] }], {
          visibleWhen: ALL(F('drawerOpen'), NOT(F('matchboxGone'))),
        }),
      ],
    ),
    [id('photoC')]: view(
      [layer('photoClose', { litFlag: LIT, caption: 'the waiting room' }), lights()],
      [
        spot(id('photoBig'), [90, 60, 620, 480], [
          { when: F(LIT), do: [say('The chair in the photograph is empty now. Someone is standing at the window.')] },
          { do: [say('This room. Someone sits in a chair that isn’t here any more. The clock on the wall says quarter past nine.')] },
        ], { looksLikeClue: true }),
      ],
    ),
    [id('bookC')]: view(
      [
        layer('bookClosedClose', { title: 'Pressed Things' }, NOT(F('bookOpen'))),
        layer('bookOpenClose', { matchGoneFlag: 'matchGone', leftCaption: 'forget-me-not', rightCaption: 'for later' }, F('bookOpen')),
        lights(),
      ],
      [
        spot(id('cover'), [250, 90, 300, 420], [{ do: [set('bookOpen'), sound('page')] }], { visibleWhen: NOT(F('bookOpen')) }),
        spot(id('match'), [455, 225, 175, 135], [{ do: [give('match'), set('matchGone'), say('A single match, pressed flat between the pages. Someone saved it for later.')] }], {
          visibleWhen: ALL(F('bookOpen'), NOT(F('matchGone'))),
        }),
      ],
    ),
    [id('potC')]: view(
      [layer('potClose', { stringGoneFlag: 'stringGone' }), lights()],
      [
        spot(id('soil'), [220, 222, 360, 50], [
          { when: F('stringGone'), do: [say('You don’t want to put your hand in there again.')] },
          { do: [say('Dry soil. A loop of string pokes out of it.')] },
        ]),
        spot(id('string'), [300, 190, 90, 70], [{ do: [say('You pull, but it won’t come. Something deep in the soil is holding on.')] }], {
          accepts: ['dog'],
          visibleWhen: NOT(F('stringGone')),
        }),
      ],
    ),
    [id('coatC')]: view(
      [layer('coatClose', { sandFlag: 'sand', keyGoneFlag: 'birdKeyGone' }), lights()],
      [
        spot(id('pocket'), [255, 285, 125, 115], [
          { when: NOT(F('sand')), do: [set('sand'), sound('sand')] },
          { do: [say('The pocket is empty now. It’s still cold inside.')] },
        ], { accepts: ['dog'] }),
        spot(id('windKey'), [240, 505, 130, 70], [{ do: [give('birdKey'), set('birdKeyGone')] }], { visibleWhen: ALL(F('sand'), NOT(F('birdKeyGone'))) }),
      ],
    ),
    [id('cageC')]: view(
      [layer('cageClose', { openFlag: 'cageOpen', keyGoneFlag: 'cageOpen' }), lights()],
      [
        spot(id('cageBody'), [190, 80, 420, 450], [
          { when: ALL(SEL('cutters'), NOT(F('cageOpen'))), do: [take('cutters'), set('cageOpen'), set('keyUnder'), sound('click')] },
          { when: F('cageOpen'), do: [say('The cage is open now. Whatever lived here is gone.')] },
          { do: [say('A heavy key hangs from the perch, out of reach.')] },
        ], { accepts: ['cutters'] }),
        spot(id('cageDoor'), [320, 290, 160, 210], [
          { when: SEL('cutters'), do: [take('cutters'), set('cageOpen'), set('keyUnder'), sound('click')] },
          { do: [say('The little door is wired shut. Twisted tight, from the inside.')] },
        ], { accepts: ['cutters'], visibleWhen: NOT(F('cageOpen')) }),
      ],
    ),
    [id('underC')]: view(
      [layer('underShelfClose', { keyGoneFlag: 'brassKeyGone' }), lights()],
      [
        spot(id('reach'), [300, 330, 240, 180], [
          { when: ANY(F('brassKeyGone'), NOT(F('keyUnder'))), do: [say('Only dust under here.')] },
          { do: [say('It’s too far back. Your arm won’t fit under the shelf.')] },
        ], { accepts: ['dog'] }),
      ],
    ),
    [id('windowC')]: view(
      [layer('windowClose', { litFlag: LIT, symbols: 'bird,key,eye,moon' }), lights()],
      [
        spot(id('glass'), [80, 40, 640, 480], [
          { when: F(LIT), do: [say('Someone has drawn on the glass with a finger. From the outside.')] },
          { do: [say('Black glass. You can’t even see your own reflection.')] },
        ], { looksLikeClue: true }),
      ],
    ),
  }

  if (ch === 3) {
    closeUps[id('lock')] = view(
      [layer('lockPlateClose', { keyFlag: 'keyIn', inscription: 'Four, in the right order.' }), lights()],
      [
        spot(id('keyhole'), [360, 355, 80, 110], [
          { when: F('keyIn'), do: [say('The key is in. It won’t turn until the dials are right.')] },
          { when: SEL('brassKey'), do: [take('brassKey'), set('keyIn'), sound('unlock')] },
          { do: [say('A big, old keyhole under the dials.')] },
        ], { accepts: ['brassKey'] }),
      ],
      'dials',
    )
  }

  return { id: r, walls, closeUps, ambient: [{ sfx: 'tick', everyMs: 1000, when: F('wound') }] }
}

const hints = (a: string, b: string, c: string): Objective['hints'] => [a, b, c]

function beat(id: string, on: Beat['on'], effects: Effect[], extra: Partial<Beat> = {}): Beat {
  return { id, on, once: true, ...extra, do: effects }
}

const after = (flag: string, when?: Cond): Beat['on'] => ({ type: 'afterFlag', flag, ...(when ? { when } : {}) })
const arrive = (at: string, when?: Cond): Beat['on'] => ({ type: 'arrive', view: at, ...(when ? { when } : {}) })
const leave = (at: string, when?: Cond): Beat['on'] => ({ type: 'leave', view: at, ...(when ? { when } : {}) })
const moment = (id: string, role: DogMoment['role'], at: string, effects: Effect[], when?: Cond): DogMoment => ({ id, role, at, ...(when ? { when } : {}), do: effects })

const chapter1: Chapter = {
  id: 'ch1',
  intro: 'A small room. The door won’t open, and it’s very dark. {dog} presses close against your leg.',
  start: { room: 'room1', wall: 'n' },
  rooms: [room(1)],
  puzzles: [],
  beats: [
    beat('b1Soil', after('stringGone'), [sound('sting'), say('Just before it came free, something under the soil pulled back.')], { threat: true, dogResponse: 'standGuard' }),
    beat('b1Knock', after('drawerOpen'), [sound('knock'), say('Three knocks. From the other side of the door.')], { threat: true, dogResponse: 'standGuard' }),
    beat('b1Sand', after('sand'), [sound('sting'), say('Sand pours out. Far more sand than a pocket could hold. Something fell out with it.')]),
    // Two threads (drawer and coat) must both be done, in either order.
    beat('b1EndKeyLast', after('birdKeyGone', F('drawerOpen')), [say('A winding key with a little bird for a handle. Somewhere, a clock has been waiting for it.'), { do: 'endChapter' }]),
    beat('b1EndDrawerLast', after('drawerOpen', F('birdKeyGone')), [say('Somewhere in the room, a clock has been waiting for that winding key.'), { do: 'endChapter' }]),
  ],
  objectives: [
    { id: 'o1Pot', doneWhen: F('stringGone'), hints: hints('{dog} keeps sniffing at the plant pot by the window.', 'There’s a string in the soil. It won’t pull free by hand.', 'Tap {dog}, then tap the string in the pot. {dog} can dig.'), dogPoints: 'room1/w' },
    { id: 'o1Drawer', doneWhen: F('drawerOpen'), hints: hints('That little iron key fits a keyhole somewhere.', '{dog} sits by the desk and looks at the drawer.', 'Select the iron key, then tap the desk drawer.'), dogPoints: 'room1/e' },
    { id: 'o1Photo', doneWhen: F('photoSeen'), hints: hints('There’s a photograph in the drawer.', '{dog} paws at the drawer. Look at the photograph up close.', 'Open the drawer and tap the photograph.'), dogPoints: 'room1/e' },
    { id: 'o1Matchbox', doneWhen: F('matchboxGone'), hints: hints('Something else is in the drawer.', 'A matchbox could be useful later.', 'Tap the matchbox in the drawer to take it.'), dogPoints: 'room1/e' },
    { id: 'o1Coat', doneWhen: F('birdKeyGone'), hints: hints('Someone left their coat behind.', '{dog} sniffs at the coat’s pocket.', 'Tap the coat, tap the pocket, then pick up what falls out.'), dogPoints: 'room1/e' },
  ],
  dogMoments: [
    moment('m1Dig', 'fetch', 'string1', [{ do: 'dog', act: 'fetch' }, give('ironKey'), set('stringGone'), say('{dog} digs, grabs the string and tugs. A small iron key comes up out of the soil.')]),
    moment('m1Sniff', 'sniff', 'pocket1', [{ do: 'dog', act: 'sniff' }, say('{dog} sniffs the pocket and sneezes. Something gritty is in there.'), set('sand'), sound('sand')], NOT(F('sand'))),
  ],
  exitWhen: ALL(F('birdKeyGone'), F('drawerOpen')),
}

const clockPuzzle: Puzzle = {
  id: 'clock',
  kind: 'clockSet',
  clues: ['photoC2'],
  initial: { h: 3, m: 45 },
  solution: { h: 9, m: 15 },
  minuteStep: 5,
  activeWhen: F('wound'),
  inactiveSay: 'Nothing turns. The clock hasn’t been wound.',
  onSolve: [set('timeSet'), sound('chime'), say('The clock chimes. Below it, the pendulum case clicks open.')],
}

const chapter2: Chapter = {
  id: 'ch2',
  intro: 'Somewhere in the room, a clock is waiting to be wound.',
  start: { room: 'room2', wall: 'e' },
  rooms: [room(2)],
  puzzles: [clockPuzzle],
  beats: [
    beat('b2CoatMoves', leave('room2/e'), [set('coatMoved')]),
    beat('b2CoatSeen', arrive('room2/e', F('coatMoved')), [sound('sting'), say('The coat is hanging on the other hook now.')]),
    beat('b2Head', arrive('room2/n', F('wound')), [sound('sting'), say('Her head has turned. She’s facing the clock now.')]),
    beat('b2Candle', after(LIT), [sound('sting'), say('The wick catches. Behind you, something in the room moves.'), sound('knock')], { threat: true, dogResponse: 'standGuard' }),
    // Two threads (clock and candle) must both be done, in either order.
    beat('b2EndCandleLast', after(LIT, F('cuttersGone')), [{ do: 'endChapter' }]),
    beat('b2EndCuttersLast', after('cuttersGone', F(LIT)), [say('Everything in the room is waiting now. Even the clock.'), { do: 'endChapter' }]),
  ],
  objectives: [
    { id: 'o2Wind', doneWhen: F('wound'), hints: hints('The clock has stopped.', 'The bird-shaped key belongs to the clock.', 'Select the winding key, then tap the clock.'), dogPoints: 'room2/n' },
    { id: 'o2Time', doneWhen: F('timeSet'), hints: hints('The clock wants a particular time.', '{dog} sits by the clock and stares at the drawer. The photograph shows the same clock.', 'Quarter past nine. The left hole turns the hours, the right hole the minutes.'), dogPoints: 'room2/n' },
    { id: 'o2Cutters', doneWhen: F('cuttersGone'), hints: hints('Something opened below the clock.', '{dog} paws at the pendulum case.', 'Tap the open pendulum case.'), dogPoints: 'room2/n' },
    { id: 'o2Match', doneWhen: F('matchGone'), hints: hints('A matchbox is no use without a match.', '{dog} sniffs along the bookshelf and stops at one book.', 'Open the red book on the shelf and take the match.'), dogPoints: 'room2/s' },
    { id: 'o2Strike', doneWhen: ANY(HAS('litMatch'), F(LIT)), hints: hints('Two things you’re carrying belong together.', 'The match and the matchbox.', 'Tap one of them, then tap the other.'), dogPoints: 'room2/e' },
    { id: 'o2Candle', doneWhen: F(LIT), hints: hints('It’s very dark in here.', '{dog} sits by the candle on the desk.', 'Select the lit match, then tap the candle.'), dogPoints: 'room2/e' },
  ],
  dogMoments: [
    moment('m2Book', 'sniff', 'book2', [{ do: 'dog', act: 'sniff' }, say('{dog} sniffs along the shelf and stops at the red book. It smells of old flowers.')]),
    moment('m2Case', 'guard', 'case2', [{ do: 'dog', act: 'standGuard' }, say('{dog} stands by the clock, very still, listening to it tick.')], F('wound')),
  ],
  exitWhen: ALL(F(LIT), F('cuttersGone')),
}

const dialPuzzle: Puzzle = {
  id: 'dials',
  kind: 'dialLock',
  clues: ['windowC3', 'room3/e'],
  symbols: ['moon', 'eye', 'key', 'bird', 'sun', 'star'],
  initial: ['star', 'sun', 'star', 'sun'],
  solution: ['moon', 'eye', 'key', 'bird'],
  onSolve: [set('dialsRight'), sound('click')],
}

const chapter3: Chapter = {
  id: 'ch3',
  intro: 'The candle burns without getting any shorter. Now you can see what the dark was hiding.',
  start: { room: 'room3', wall: 'e' },
  rooms: [room(3)],
  puzzles: [dialPuzzle],
  beats: [
    beat('b3Feet', arrive('room3/n', ALL(NOT(F('doorOpen')), NOT(F('feet')))), [set('feet'), sound('steps'), say('Shadows under the door. Someone is standing just outside.')], { threat: true, dogResponse: 'standGuard' }),
    beat('b3FeetGo', leave('room3/n', F('feet')), [set('feetGone')]),
    beat('b3FeetGone', arrive('room3/n', F('feetGone')), [say('The shadows have gone. {dog} gives one short, proud wag.')]),
    beat('b3Whisper', arrive('room3/w'), [sound('whisper'), say('Whispering, close to the window. It stops when {dog} growls.')], { threat: true, dogResponse: 'standGuard' }),
    beat('b3Music', arrive('room3/s'), [sound('musicbox')]),
    beat('b3WindowSeen', arrive('windowC3'), [set('windowSeen'), sound('eerie')]),
    beat('b3TurnAround', leave('windowC3'), [sound('sting'), say('You turn around quickly. Nobody there. {dog} is still beside you.')]),
    beat('b3Cage', after('cageOpen'), [sound('sting'), say('The wire snaps. The key drops, bounces and skitters under the bookshelf.')]),
    beat('b3KeyNoDials', after('keyIn', NOT(F('dialsRight'))), [say('The key goes in, but it won’t turn. The dials aren’t right yet.')]),
    beat('b3DialsNoKey', after('dialsRight', NOT(F('keyIn'))), [say('The dials settle into place, but the door is still locked.')]),
    beat('b3KeyLast', after('keyIn', F('dialsRight')), [set('unlocked')]),
    beat('b3DialsLast', after('dialsRight', F('keyIn')), [set('unlocked')]),
    beat('b3Unlocked', after('unlocked'), [sound('unlock'), say('The key turns. The door opens a crack onto the dark. {dog}’s ears go up.')]),
  ],
  objectives: [
    { id: 'o3Cage', doneWhen: F('cageOpen'), hints: hints('Something is hanging inside the birdcage.', 'The cage door is wired shut.', 'Select the cutters, then tap the cage door.'), dogPoints: 'room3/s' },
    { id: 'o3Fetch', doneWhen: F('brassKeyGone'), hints: hints('The key went under the bookshelf.', '{dog} lies flat and stares into the gap under the shelf.', 'Tap {dog}, then tap the gap under the shelf. {dog} can squeeze in.'), dogPoints: 'room3/s' },
    { id: 'o3Keyhole', doneWhen: F('keyIn'), hints: hints('The door has a keyhole as well as dials.', 'The heavy brass key.', 'Select the brass key, then tap the door.'), dogPoints: 'room3/n' },
    { id: 'o3Window', doneWhen: F('windowSeen'), hints: hints('Light makes reflections.', '{dog} sits by the window and looks at the glass.', 'Look closely at the window now that the candle is lit.'), dogPoints: 'room3/w' },
    { id: 'o3Dials', doneWhen: F('dialsRight'), hints: hints('The dials want four symbols.', 'Read the note on the desk, then look at the window again.', 'Moon, eye, key, bird.'), dogPoints: 'room3/n' },
    { id: 'o3Out', doneWhen: F('doorOpen'), hints: hints('The door is open a crack, but it’s dark out there.', '{dog} stands by the door, tail going.', 'Tap {dog}, then tap the door. {dog} will go first.'), dogPoints: 'room3/n' },
  ],
  dogMoments: [
    moment('m3Fetch', 'fetch', 'reach3', [{ do: 'dog', act: 'fetch' }, give('brassKey'), set('brassKeyGone'), say('{dog} squeezes flat under the shelf and comes back with the heavy brass key.')], ALL(F('keyUnder'), NOT(F('brassKeyGone')))),
    moment('m3Hero', 'hero', 'door3', [{ do: 'dog', act: 'trot' }, set('doorOpen'), say('{dog} noses the door wide and trots out into the dark. A happy bark comes back: it’s safe.'), { do: 'endChapter' }], F('unlocked')),
  ],
  exitWhen: F('doorOpen'),
}

export function waitingRoom(): Level {
  return {
    id: 'waiting-room',
    schema: 1,
    title: 'The Waiting Room',
    theme: 'The prototype test room, ported',
    palette: 'waiting',
    items: {
      ironKey: { name: 'Small iron key', desc: 'Cold, and still caked with soil.', icon: 'ironKey' },
      matchbox: { name: 'Empty matchbox', desc: 'The striking strip is still rough.', icon: 'matchbox' },
      match: { name: 'A single match', desc: 'Pressed flat, but the head looks dry.', icon: 'match' },
      litMatch: { name: 'Lit match', desc: 'It burns slowly. Unnaturally slowly.', icon: 'litMatch' },
      birdKey: { name: 'Winding key', desc: 'A clock key with a little bird for a handle.', icon: 'birdKey' },
      cutters: { name: 'Clockmaker’s cutters', desc: 'Tiny, and very sharp.', icon: 'cutters' },
      brassKey: { name: 'Heavy brass key', desc: 'Too big for anything in this room except the door.', icon: 'brassKey' },
      glassEye: { name: 'Glass eye', desc: 'Grey-green. It seems to be looking at you.', icon: 'glassEye' },
    },
    combos: [{ a: 'match', b: 'matchbox', make: 'litMatch', say: 'You strike the match. It burns with a small, very steady flame.' }],
    chapters: [chapter1, chapter2, chapter3],
    secrets: [{ id: 'sEye', foundWhen: HAS('glassEye'), tell: { view: 'portraitC3', layer: 'portraitFace3' } }],
    endings: [
      { id: 'endEye', when: HAS('glassEye'), text: 'Behind you, the clock strikes quarter past nine again. In your pocket, the glass eye has gone warm. {dog} led you out.' },
      { id: 'endOut', text: 'Behind you, the clock strikes quarter past nine again. Someone is still watching, but {dog} led you out.' },
    ],
  }
}
