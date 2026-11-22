"""Art direction and pose tracks for the Moonshadow Lake sprite masters.

Channels are pixel offsets in a 512px cell. Each track describes one joint:
horizontal/vertical translation or radians of rotation about its marked pivot.
A frame samples all of the tracks, always from the same unmodified master.
"""
from dataclasses import dataclass, field


@dataclass(frozen=True)
class Joint:
    center: tuple[float, float]
    radius: tuple[float, float]
    pivot: tuple[float, float] | None = None


@dataclass(frozen=True)
class Model:
    key: str
    variant: str
    source_box: tuple[int, int, int, int] | None
    width: int
    height: int
    baseline: int
    display_size: int
    row: str
    joints: dict[str, Joint] = field(default_factory=dict)
    opacity: float = 1


# Windows are expressed relative to the painted figure, not the untouched cell.
MODELS = (
    Model("tide-slime", "r1", (0, 85, 455, 376), 352, 266, 497, 91, "back", {
        "face": Joint((.28, .60), (.35, .34)),
        "crest": Joint((.50, .23), (.56, .41)),
        "shell": Joint((.74, .52), (.37, .47)),
    }),
    Model("mist-wisp", "r1", (450, 0, 840, 385), 270, 354, 478, 92, "back", {
        "mask": Joint((.34, .54), (.35, .36), (.32, .57)),
        "crest": Joint((.61, .21), (.44, .36)),
        "tail": Joint((.49, .88), (.32, .25)),
    }),
    Model("stone-crab", "r1", (855, 39, 1320, 378), 420, 302, 497, 105, "front", {
        "shell": Joint((.56, .39), (.46, .48)),
        "left-claw": Joint((.15, .68), (.26, .38), (.24, .53)),
        "right-claw": Joint((.48, .80), (.27, .30), (.60, .61)),
        "rear-legs": Joint((.87, .69), (.24, .30)),
    }),
    Model("shadow-serpent", "r1", (1332, 0, 1774, 382), 414, 403, 497, 124, "front", {
        "head": Joint((.37, .25), (.34, .27), (.47, .34)),
        "neck": Joint((.49, .43), (.36, .33)),
        "coil": Joint((.53, .68), (.50, .28)),
        "tail": Joint((.80, .61), (.30, .25)),
    }),
    Model("shadow-serpent", "r2", None, 361, 427, 497, 124, "front", {
        "head": Joint((.47, .21), (.43, .25), (.54, .28)),
        "neck": Joint((.53, .44), (.43, .31)),
        "coil": Joint((.52, .69), (.51, .27)),
        "tail": Joint((.77, .73), (.29, .25)),
    }),
    Model("weeping-siren", "r1", (431, 402, 855, 887), 352, 408, 497, 120, "back", {
        "head": Joint((.38, .22), (.30, .26), (.41, .27)),
        "hair": Joint((.73, .42), (.33, .48)),
        "chest": Joint((.43, .39), (.30, .37)),
        "hand": Joint((.26, .42), (.24, .26)),
        "tail": Joint((.27, .76), (.30, .28)),
    }),
    Model("weeping-siren", "r2", (880, 385, 1313, 887), 365, 428, 484, 120, "back", {
        "head": Joint((.39, .19), (.29, .24), (.42, .26)),
        "hair": Joint((.72, .35), (.36, .40)),
        "chest": Joint((.41, .37), (.32, .35)),
        "hand": Joint((.13, .48), (.28, .26)),
        "tail": Joint((.51, .77), (.42, .38)),
    }),
    Model("mirror-shade", "r1", (1314, 409, 1774, 887), 397, 405, 497, 102, "back", {
        "head": Joint((.56, .26), (.32, .26), (.53, .35)),
        "chest": Joint((.60, .49), (.41, .32)),
        "cloth": Joint((.83, .62), (.23, .33)),
        "blade": Joint((.19, .46), (.30, .47), (.36, .52)),
    }, .88),
)

SEEDS = {
    "tide-slime": ("foe_ember_slime", "foes2", 1),
    "mist-wisp": ("foe_rift_wisp", "foes2", 7),
    "stone-crab": ("foe_shard_crawler", "foes2", 8),
    "shadow-serpent": ("foe_tusker", "foes", 0),
    "weeping-siren": ("foe_riftweaver", "foes", 5),
    "mirror-shade": ("foe_hunter", "foes", 9),
}

ATLAS_FRAMES = {
    "attack": (1, 2, 3, 4, 5, 6, 7, 8),
    "skill": (9, 10, 11, 12, 13, 14, 15, 16),
    "hit": (17, 18),
    "down": (19, 20, 21),
    "idle": (22, 23, 24),
}
ACTION_BEATS = ("ready", "windup", "windup", "anticipation", "contact",
                "follow-through", "settle", "ready")

# Windup and contact strengths for the four prepare and four recover slots.
WINDUP = (0, .30, .65, 1, 0, 0, 0, 0)
CONTACT = (0, 0, 0, 0, 1, .73, .31, 0)


@dataclass(frozen=True)
class Action:
    intent: str
    lane: str
    gesture: str
    windup: dict[str, float | tuple] = field(default_factory=dict)
    contact: dict[str, float | tuple] = field(default_factory=dict)


ACTIONS = {
    "tide-slime": (
        Action("Water Spit", "skill", "Wells up through the dome, puckers left, opens and bounces back.",
               {"bend": 15, "crest": (12, 24), "face": (9, 11), "mouth": .28},
               {"bend": -22, "crest": (-9, -9), "face": (-16, -6), "mouth": 1}),
    ),
    "mist-wisp": (
        Action("Mist Needle", "attack", "Draws mist inward, then points the mask left in a short forward hover.",
               {"bend": 13, "hover": -9, "mask": (9, -6, .03), "crest": (8, 14), "tail": (6, -9)},
               {"bend": -20, "hover": 7, "mask": (-25, 5, -.045), "crest": (18, -10), "tail": (14, 5)}),
    ),
    "stone-crab": (
        Action("Pincer", "attack", "Cocks both claws, leading claw snaps forward, rear legs brace.",
               {"bend": 9, "shell": (0, -9), "left-claw": (9, -14, .16), "right-claw": (1, -22, .15)},
               {"bend": -10, "shell": (-7, 8), "left-claw": (-23, 2, -.16),
                "right-claw": (-18, -2, -.22), "rear-legs": (7, 0)}),
    ),
    "shadow-serpent": (
        Action("Shadow Fang", "attack", "Head draws back above the coil and pitches left into a short bite.",
               {"head": (18, -9, .10), "neck": (11, -10), "tail": (-10, -7), "mouth": .15},
               {"head": (-39, 14, -.12), "neck": (-21, 9), "coil": (0, -7), "mouth": 1}),
        Action("Venom Spit", "skill", "Lifts the throat, flicks its jaw open, then recoils with its coil planted.",
               {"head": (12, -15, .09), "neck": (11, -10), "coil": (-5, -2), "mouth": .22},
               {"head": (-21, -9, .09), "neck": (3, 11), "tail": (10, -4), "mouth": 1}),
        Action("Coil Gathering", "skill", "Tucks its head and draws the outer loop in around the lower neck.",
               {"head": (12, 15, .08), "neck": (6, 15), "tail": (-19, -10), "coil": (3, -12)},
               {"head": (19, 21, .1), "neck": (9, 15), "tail": (-23, -13), "coil": (-7, -14)}),
        Action("Crushing Coil", "skill", "Rears up, then drives down hard as the outer coil squeezes inward.",
               {"head": (11, -20, .06), "neck": (6, -19), "tail": (9, -12)},
               {"head": (-19, 36, -.10), "neck": (-12, 27), "tail": (-24, 5), "coil": (-12, -14)}),
    ),
    "weeping-siren": (
        Action("Tide Lash", "attack", "Pulls the spill of hair back, then whips it past the shoulder as a hand leads.",
               {"head": (7, 4, .055), "hair": (21, -5), "chest": (8, 0), "hand": (13, -10), "tail": (9, 8)},
               {"head": (-11, 2, -.05), "hair": (-31, -12), "chest": (-13, 2), "hand": (-26, -12), "tail": (-16, -7)}),
        Action("Weeping Song", "skill", "Bows into her chest, then lifts her chin and opens her shoulders into the note.",
               {"head": (-4, 13, -.075), "chest": (-5, 9), "hand": (11, -14), "hair": (4, 7)},
               {"head": (0, -13, .11), "chest": (1, -11), "hand": (-15, -13), "hair": (14, -11), "mouth": .75}),
        Action("Drowning Call", "skill", "Gathers one hand high and then beckons left and down.",
               {"head": (6, -10, .05), "chest": (6, -8), "hand": (2, -28), "tail": (16, -9)},
               {"head": (-4, 11, -.075), "chest": (-10, 6), "hand": (-27, 22), "hair": (-17, 6), "tail": (-11, 7)}),
    ),
    "mirror-shade": (
        Action("Mirror Strike", "attack", "Draws the blade high, cuts down-left, then rolls wrist back into guard.",
               {"bend": 9, "head": (5, -3, .03), "chest": (9, -1), "cloth": (9, -7), "blade": (20, -21, .19)},
               {"bend": -9, "head": (-8, 4, -.04), "chest": (-12, 6), "cloth": (15, -8), "blade": (-11, 40, -.34)}),
    ),
}

# Hit recoils from the party (right). Down ends low or fades in place.
HIT = {
    "tide-slime": {"face": (22, 9), "crest": (14, 16), "shell": (10, 10), "bend": 10},
    "mist-wisp": {"mask": (18, 4, .06), "crest": (12, 2), "tail": (-11, 4), "hover": -7},
    "stone-crab": {"shell": (11, 9), "left-claw": (12, -7, .11), "right-claw": (7, -8, .12)},
    "shadow-serpent": {"head": (27, 9, .09), "neck": (15, 5), "tail": (-8, -9)},
    "weeping-siren": {"head": (17, 6, .07), "chest": (11, 5), "hair": (13, -10), "hand": (9, 4)},
    "mirror-shade": {"head": (14, 5, .07), "chest": (13, 8), "cloth": (12, -9), "blade": (8, -3, .12)},
}
DOWN = {
    "tide-slime": {"sink": 34, "face": (4, 9), "crest": (1, 16), "shell": (8, 8)},
    "mist-wisp": {"hover": 19, "sink": 22, "crest": (1, 4), "tail": (5, -7), "fade": .57},
    "stone-crab": {"sink": 23, "shell": (6, 15), "left-claw": (1, 8, -.09), "right-claw": (8, 5, -.10)},
    "shadow-serpent": {"sink": 42, "head": (-9, 55, -.18), "neck": (-7, 31), "tail": (-1, 9)},
    "weeping-siren": {"sink": 29, "head": (-11, 29, -.14), "chest": (-10, 16), "hair": (6, 25), "hand": (5, 14)},
    "mirror-shade": {"sink": 36, "head": (-19, 39, -.20), "chest": (-17, 26), "cloth": (-9, 12),
                     "blade": (8, 40, -.39), "fade": .27},
}
HOVER = (
    {},
    {"hover": -11, "crest": (-3, -4), "tail": (5, 1)},
    {"hover": 8, "crest": (3, 1), "tail": (-4, 1)},
)
