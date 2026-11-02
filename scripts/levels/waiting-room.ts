// Builds levels/test/waiting-room.json: the prototype room (docs/reference/prototype.html)
// as level data, split into three chapters in the same room. This is a
// test fixture, not a secret level. Run `npm run fixtures` after editing.
//
// Each chapter has its own copy of the room (ids must be unique), but all copies draw from
// the same flags, so the room looks continuous.
import type { Beat, Chapter, Cond, Effect, Hotspot, Level, Objective, Puzzle, Room, View } from '../../src/engine/schema.ts'

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
          { when: F('doorOpen'), do: [set('left'), { do: 'endChapter' }] },
          { when: SEL('brassKey'), do: [open(id('lock')), take('brassKey'), set('keyIn'), sound('unlock')] },
          { do: [open(id('lock'))] },
        ]

  const walls: Room['walls'] = {
    n: view(
      [
        layer('roomShell'),
        layer('portrait', faceFlags),
        layer('door', { litFlag: LIT, keyFlag: 'keyIn', openFlag: 'doorOpen', feetFlag: LIT, feetGoneFlag: 'shadowGone' }),
        layer('caseClock', { ...CLOCK, woundFlag: 'wound', caseOpenFlag: 'timeSet', cuttersGoneFlag: 'cuttersGone' }),
        lights(),
      ],
      [
        spot(id('portrait'), [100, 120, 160, 200], [{ do: [open(id('portraitC'))] }]),
        spot(id('door'), [322, 142, 190, 312], doorRules, { accepts: ch === 3 ? ['brassKey'] : [] }),
        spot(id('shadow'), [340, 430, 120, 85], [{ do: [set('shadowGone'), sound('steps'), say('The shadows step away from the door. Slowly.')] }], {
          visibleWhen: ALL(F(LIT), NOT(F('doorOpen')), NOT(F('shadowGone'))),
        }),
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
      [layer('roomShell'), layer('rug'), layer('bookshelf'), layer('birdcage', { keyGoneFlag: 'brassKeyGone', openFlag: 'cageOpen' }), lights()],
      [
        spot(id('book'), [286, 192, 50, 80], [{ do: [open(id('bookC'))] }]),
        spot(id('cage'), [530, 130, 140, 190], [{ do: [open(id('cageC'))] }]),
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
        spot(id('string'), [300, 190, 90, 70], [{ do: [give('ironKey'), set('stringGone')] }], { visibleWhen: NOT(F('stringGone')) }),
      ],
    ),
    [id('coatC')]: view(
      [layer('coatClose', { sandFlag: 'sand', keyGoneFlag: 'birdKeyGone' }), lights()],
      [
        spot(id('pocket'), [255, 285, 125, 115], [
          { when: NOT(F('sand')), do: [set('sand'), sound('sand')] },
          { do: [say('The pocket is empty now. It’s still cold inside.')] },
        ]),
        spot(id('windKey'), [240, 505, 130, 70], [{ do: [give('birdKey'), set('birdKeyGone')] }], { visibleWhen: ALL(F('sand'), NOT(F('birdKeyGone'))) }),
      ],
    ),
    [id('cageC')]: view(
      [layer('cageClose', { openFlag: 'cageOpen', keyGoneFlag: 'brassKeyGone' }), lights()],
      [
        spot(id('cageBody'), [190, 80, 420, 450], [
          { when: ALL(SEL('cutters'), NOT(F('cageOpen'))), do: [take('cutters'), set('cageOpen'), sound('click')] },
          { when: F('cageOpen'), do: [say('The cage is open now. Whatever lived here is gone.')] },
          { do: [say('A heavy key hangs from the perch, out of reach.')] },
        ], { accepts: ['cutters'] }),
        spot(id('cageDoor'), [320, 290, 160, 210], [
          { when: SEL('cutters'), do: [take('cutters'), set('cageOpen'), sound('click')] },
          { do: [say('The little door is wired shut. Twisted tight, from the inside.')] },
        ], { accepts: ['cutters'], visibleWhen: NOT(F('cageOpen')) }),
        spot(id('cageKey'), [350, 410, 100, 60], [{ do: [give('brassKey'), set('brassKeyGone'), say('A heavy brass key. It’s warm, as if someone was holding it.')] }], {
          visibleWhen: ALL(F('cageOpen'), NOT(F('brassKeyGone'))),
        }),
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

function beat(id: string, on: Beat['on'], effects: Effect[]): Beat {
  return { id, on, once: true, do: effects }
}

const after = (flag: string, when?: Cond): Beat['on'] => ({ type: 'afterFlag', flag, ...(when ? { when } : {}) })
const arrive = (at: string, when?: Cond): Beat['on'] => ({ type: 'arrive', view: at, ...(when ? { when } : {}) })
const leave = (at: string, when?: Cond): Beat['on'] => ({ type: 'leave', view: at, ...(when ? { when } : {}) })

// Someone outside the door, seen once on arriving at the north wall after the candle is lit.
const shadowBeat = (id: string, roomId: string) =>
  beat(id, arrive(`${roomId}/n`, ALL(F(LIT), NOT(F('doorOpen')), NOT(F('shadowGone')), NOT(F('shadowSeen')))), [
    set('shadowSeen'),
    sound('steps'),
    say('There’s someone standing just outside the door.'),
  ])

const chapter1: Chapter = {
  id: 'ch1',
  intro: 'A small room. The door won’t open, and it’s very dark.',
  start: { room: 'room1', wall: 'n' },
  rooms: [room(1)],
  puzzles: [],
  beats: [
    beat('b1Soil', after('stringGone'), [sound('sting'), say('A small iron key on a string. Just before it came free, something under the soil pulled back.')]),
    beat('b1Knock', after('drawerOpen'), [sound('knock'), say('Three knocks. From the other side of the door.')]),
    beat('b1Sand', after('sand'), [sound('sting'), say('Sand pours out. Far more sand than a pocket could hold. Something fell out with it.')]),
    // Two threads (drawer and coat) must both be done, in either order.
    beat('b1EndKeyLast', after('birdKeyGone', F('drawerOpen')), [say('A winding key with a little bird for a handle. Somewhere, a clock has been waiting for it.'), { do: 'endChapter' }]),
    beat('b1EndDrawerLast', after('drawerOpen', F('birdKeyGone')), [say('Somewhere in the room, a clock has been waiting for that winding key.'), { do: 'endChapter' }]),
  ],
  objectives: [
    { id: 'o1Pot', doneWhen: F('stringGone'), hints: hints('Something is hidden in the plant pot.', 'Look closely at the soil by the window.', 'Pull the string poking out of the soil.') },
    { id: 'o1Drawer', doneWhen: F('drawerOpen'), hints: hints('That iron key fits a small keyhole somewhere.', 'Look at the desk.', 'Select the iron key, then tap the drawer.') },
    { id: 'o1Photo', doneWhen: F('photoSeen'), hints: hints('There’s a photograph in the drawer.', 'Look at it up close.', 'Tap the photograph in the drawer.') },
    { id: 'o1Matchbox', doneWhen: F('matchboxGone'), hints: hints('The drawer is open now.', 'Look inside it.', 'Take the matchbox.') },
    { id: 'o1Coat', doneWhen: F('birdKeyGone'), hints: hints('Someone left their coat behind.', 'Check the coat’s pocket.', 'Tap the pocket, then pick up what falls out.') },
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
    beat('b2Candle', after(LIT), [sound('sting'), say('The wick catches. Behind you, something in the room moves.'), sound('knock')]),
    shadowBeat('b2Shadow', 'room2'),
    // Two threads (clock and candle) must both be done, in either order.
    beat('b2EndCandleLast', after(LIT, F('cuttersGone')), [{ do: 'endChapter' }]),
    beat('b2EndCuttersLast', after('cuttersGone', F(LIT)), [say('Everything in the room is waiting now. Even the clock.'), { do: 'endChapter' }]),
  ],
  objectives: [
    { id: 'o2Wind', doneWhen: F('wound'), hints: hints('The clock has stopped.', 'The bird-shaped key belongs to the clock.', 'Select the winding key, then tap the clock face.') },
    { id: 'o2Time', doneWhen: F('timeSet'), hints: hints('The clock wants a particular time.', 'The photograph shows the same clock.', 'Quarter past nine. The left hole turns the hours, the right hole the minutes.') },
    { id: 'o2Cutters', doneWhen: F('cuttersGone'), hints: hints('Something opened below the clock.', 'Look at the pendulum case.', 'Tap the open pendulum case.') },
    { id: 'o2Match', doneWhen: F('matchGone'), hints: hints('A matchbox is no use without a match.', 'One of the books looks different.', 'Open the red book on the shelf.') },
    { id: 'o2Strike', doneWhen: ANY(HAS('litMatch'), F(LIT)), hints: hints('Two things you’re carrying belong together.', 'The match and the matchbox.', 'Tap one of them, then tap the other.') },
    { id: 'o2Candle', doneWhen: F(LIT), hints: hints('It’s very dark in here.', 'The candle on the desk.', 'Select the lit match, then tap the candle.') },
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
    shadowBeat('b3Shadow', 'room3'),
    beat('b3Whisper', arrive('room3/w'), [sound('whisper'), say('Whispering, close to the window. It stops when you listen.')]),
    beat('b3Music', arrive('room3/s'), [sound('musicbox')]),
    beat('b3WindowSeen', arrive('windowC3'), [set('windowSeen'), sound('eerie')]),
    beat('b3TurnAround', leave('windowC3'), [sound('sting'), say('You turn around quickly. Nobody there.')]),
    beat('b3Cage', after('cageOpen'), [sound('sting'), say('The wire snaps. It was twisted shut from the inside.')]),
    beat('b3KeyNoDials', after('keyIn', NOT(F('dialsRight'))), [say('The key goes in, but it won’t turn. The dials aren’t right yet.')]),
    beat('b3DialsNoKey', after('dialsRight', NOT(F('keyIn'))), [say('The dials settle into place, but the door is still locked.')]),
    beat('b3KeyLast', after('keyIn', F('dialsRight')), [set('doorOpen')]),
    beat('b3DialsLast', after('dialsRight', F('keyIn')), [set('doorOpen')]),
    beat('b3DoorOpens', after('doorOpen'), [sound('unlock'), say('The key turns. The door swings open by itself.')]),
  ],
  objectives: [
    { id: 'o3Cage', doneWhen: F('cageOpen'), hints: hints('Something is hanging inside the birdcage.', 'The cage door is wired shut.', 'Select the cutters, then tap the cage door.') },
    { id: 'o3CageKey', doneWhen: F('brassKeyGone'), hints: hints('The cage is open.', 'Take what’s inside it.', 'Tap the key hanging from the perch.') },
    { id: 'o3Keyhole', doneWhen: F('keyIn'), hints: hints('The door has a keyhole as well as dials.', 'The heavy brass key.', 'Select the brass key, then tap the door.') },
    { id: 'o3Window', doneWhen: F('windowSeen'), hints: hints('Light makes reflections.', 'Look closely at the window.', 'Look at the window now that the candle is lit.') },
    { id: 'o3Dials', doneWhen: F('dialsRight'), hints: hints('The dials want four symbols.', 'Read the note on the desk, then look at the window again.', 'Moon, eye, key, bird.') },
    { id: 'o3Out', doneWhen: F('left'), hints: hints('The door is open.', 'Go through it.', 'Tap the open door.') },
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
      { id: 'endEye', when: HAS('glassEye'), text: 'Behind you, the clock strikes quarter past nine again. In your pocket, the glass eye has gone warm.' },
      { id: 'endOut', text: 'Behind you, the clock strikes quarter past nine again. You have the feeling someone is still watching.' },
    ],
  }
}
