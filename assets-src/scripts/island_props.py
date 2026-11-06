# Builds the island's props in Blender and exports one GLB per prop to public/models/.
#   blender -b --python assets-src/scripts/island_props.py -- <repo root>
# Blender is Z-up; the glTF exporter turns Blender -Y into glTF +Z, so "forward" (bow, line
# direction) is modelled along -Y.
import bpy, bmesh, math, sys, random
from mathutils import Vector

ROOT = sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv else "."
OUT = ROOT + "/public/models/"

_mats = {}
def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    _mats.clear()

def mat(name, rgb, rough=0.7, metal=0.0, alpha=1.0, emit=None):
    if name in _mats: return _mats[name]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*rgb, 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    if alpha < 1:
        b.inputs["Alpha"].default_value = alpha
        m.blend_method = "BLEND" if hasattr(m, "blend_method") else None
    if emit:
        b.inputs["Emission Color"].default_value = (*emit, 1)
        b.inputs["Emission Strength"].default_value = 0.0
    _mats[name] = m
    return m

def hexc(h):
    h = h.lstrip("#")
    c = [int(h[i:i+2], 16) / 255 for i in (0, 2, 4)]
    return tuple(((x + 0.055) / 1.055) ** 2.4 if x > 0.04045 else x / 12.92 for x in c)

def obj_from_bm(bm, name, material, parent=None):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(o)
    o.data.materials.append(material)
    for p in o.data.polygons: p.use_smooth = False
    if parent: o.parent = parent
    return o

def box(name, size, loc, material, parent=None, rot=(0, 0, 0), bevel=0.0):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1)
    for v in bm.verts: v.co = Vector((v.co.x * size[0], v.co.y * size[1], v.co.z * size[2]))
    if bevel > 0:
        bmesh.ops.bevel(bm, geom=bm.edges[:], offset=bevel, segments=1, affect="EDGES")
    o = obj_from_bm(bm, name, material, parent)
    o.location = loc; o.rotation_euler = rot
    return o

def cyl(name, r1, r2, h, loc, material, parent=None, seg=16, rot=(0, 0, 0)):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r1, radius2=r2, depth=h)
    o = obj_from_bm(bm, name, material, parent)
    o.location = loc; o.rotation_euler = rot
    return o

def ico(name, r, loc, material, parent=None, sub=1, scale=(1, 1, 1), jitter=0.0, seed=0):
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=sub, radius=r)
    rnd = random.Random(seed)
    for v in bm.verts:
        v.co = Vector((v.co.x * scale[0], v.co.y * scale[1], v.co.z * scale[2])) * (1 + (rnd.random() - 0.5) * jitter)
    o = obj_from_bm(bm, name, material, parent)
    o.location = loc
    return o

def loft(name, sections, material, parent=None, cap=True):
    """sections: list of (y, [(x, z), ...]) rings with equal point counts."""
    bm = bmesh.new()
    rings = [[bm.verts.new((x, y, z)) for (x, z) in pts] for y, pts in sections]
    n = len(rings[0])
    for a, b in zip(rings, rings[1:]):
        for i in range(n):
            j = (i + 1) % n
            try: bm.faces.new((a[i], a[j], b[j], b[i]))
            except ValueError: pass
    if cap:
        for r in (rings[0], rings[-1]):
            try: bm.faces.new(r)
            except ValueError: pass
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=1e-4)
    return obj_from_bm(bm, name, material, parent)

def empty(name):
    o = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(o)
    return o

def merge(objs, name):
    """Join objects into one mesh (keeps per-face materials)."""
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.parent_clear(type="CLEAR_KEEP_TRANSFORM")
    bpy.ops.object.join()
    o = bpy.context.view_layer.objects.active
    o.name = name; o.data.name = name
    return o

def export(path, root_names=None):
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.export_scene.gltf(filepath=OUT + path, export_format="GLB", use_selection=True, export_apply=True, export_yup=True)

# ------------------------------------------------------------------ ropeway station
def ropeway_station():
    reset()
    concrete = mat("RsConcrete", hexc("#c9c6bf"), 0.9)
    steel = mat("RsSteel", hexc("#5d646e"), 0.4, 0.7)
    red = mat("RsRed", hexc("#d4202a"), 0.45, 0.1)
    glass = mat("RsGlass", hexc("#a9d8f0"), 0.05, 0.3, alpha=0.35)
    dark = mat("RsDark", hexc("#2a2e35"), 0.6, 0.3)
    white = mat("RsWhite", hexc("#f2f3f5"), 0.6)
    root = empty("RopeStation")
    # a plinth that runs 2.4 m into the ground so it seats into any slope
    box("Plinth", (8.4, 10.4, 3.0), (0, 0, -0.9), concrete, root, bevel=0.06)
    box("Deck", (8.0, 10.0, 0.25), (0, 0, 0.72), white, root)
    for sx in (-3.7, 3.7):
        for sy in (-4.6, -1.5, 1.5, 4.6):
            box("Post", (0.22, 0.22, 3.4), (sx, sy, 2.5), steel, root)
    # glass hall with a solid back half for the drive room
    box("GlassL", (0.06, 9.2, 2.6), (-3.7, 0, 2.15), glass, root)
    box("GlassR", (0.06, 9.2, 2.6), (3.7, 0, 2.15), glass, root)
    box("DriveRoom", (7.2, 2.6, 2.8), (0, 3.4, 2.25), white, root, bevel=0.05)
    box("Stripe", (7.25, 2.65, 0.3), (0, 3.4, 3.4), red, root)
    # the bull wheel the rope turns round, in its open housing
    bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=32, radius1=2.3, radius2=2.3, depth=0.25)
    w = obj_from_bm(bm, "BullWheel", steel, root); w.location = (0, -1.2, 3.1)
    box("Hub", (0.5, 0.5, 0.9), (0, -1.2, 3.0), dark, root)
    # curved roof: an arched shell over the hall, overhanging both ends
    secs = []
    for k in range(13):
        t = k / 12
        x = -4.5 + 9 * t
        z = 4.25 + 0.75 * math.sin(math.pi * t)
        secs.append((x, z))
    pts = secs + [(x, z + 0.22) for (x, z) in reversed(secs)]
    roof = loft("Roof", [(y, pts) for y in (-5.8, 5.8)], red, root)
    roof.rotation_euler = (0, 0, 0)
    # stairs on one side and a nameplate
    for i in range(5):
        box("Step", (2.0, 0.4, 0.18 * (i + 1)), (-5.2, -2 + i * 0.4, 0.09 * (i + 1)), concrete, root)
    box("Sign", (3.2, 0.08, 0.6), (0, -4.9, 4.0), dark, root)
    export("ropeway-station.glb")

# ------------------------------------------------------------------ ships
def hull_sections(L, B, D, bow=0.32, stern=0.06, n=9):
    """A displacement hull: rounded bilge, raked bow tapering to a stem at -Y, transom at +Y."""
    out = []
    for k in range(n + 1):
        t = k / n  # 0 = bow, 1 = stern
        y = -L / 2 + L * t
        if t < bow:
            w = (t / bow) ** 0.7
        elif t > 1 - stern:
            w = 0.92 + 0.08 * (1 - t) / stern
        else:
            w = 1.0
        hw = max(B / 2 * w, 0.05)
        sheer = D + 0.25 * (1 - t / bow) if t < bow else D
        keel = -0.2 + 0.6 * (1 - min(t / bow, 1)) ** 2
        ring = [(-hw, sheer), (-hw, keel + 0.9 * (sheer - keel) * 0.3), (-hw * 0.78, keel + 0.12), (0, keel),
                (hw * 0.78, keel + 0.12), (hw, keel + 0.9 * (sheer - keel) * 0.3), (hw, sheer)]
        out.append((y, ring))
    return out

def cargo_ship():
    reset()
    hullc = mat("ShipHull", hexc("#24303f"), 0.6)
    anti = mat("ShipAntifoul", hexc("#a8322a"), 0.7)
    deck = mat("ShipDeck", hexc("#e9ecef"), 0.7)
    win = mat("ShipWindows", hexc("#ffd27a"), 0.3, emit=hexc("#ffd27a"))
    nr = mat("NavRed", hexc("#ff2d2d"), 0.3, emit=hexc("#ff2d2d"))
    ng = mat("NavGreen", hexc("#2dff6a"), 0.3, emit=hexc("#2dff6a"))
    nw = mat("NavWhite", hexc("#fff6d8"), 0.3, emit=hexc("#fff6d8"))
    funnel = mat("ShipFunnel", hexc("#c2382f"), 0.5)
    root = empty("CargoShip")
    L, B, D = 30, 5.6, 2.4
    loft("Hull", hull_sections(L, B, D), hullc, root)
    # waterline band
    band = loft("Boot", [(y, [(x * 1.01, min(z, 0.35) if z > 0.35 else z) for x, z in r]) for y, r in hull_sections(L * 0.995, B, 0.35)], anti, root)
    box("MainDeck", (B - 0.3, L * 0.78, 0.12), (0, 1.2, D - 0.02), deck, root)
    cols = ["#d9822b", "#2d6cdf", "#c93c3c", "#3aa66b", "#e4c440", "#7a52c7", "#e9ecef"]
    rnd = random.Random(3)
    for bay in range(7):
        for row in range(3):
            for tier in range(rnd.choice([1, 2, 2, 3])):
                c = mat("Box" + cols[(bay * 3 + row + tier) % len(cols)], hexc(cols[(bay * 3 + row + tier * 2) % len(cols)]), 0.8)
                box("Cntr", (1.55, 2.4, 1.0), ((row - 1) * 1.62, -8.6 + bay * 2.55, D + 0.55 + tier * 1.02), c, root, bevel=0.03)
    # accommodation block and bridge at the stern
    box("House", (4.6, 3.4, 4.0), (0, 11.0, D + 2.0), deck, root, bevel=0.05)
    box("Bridge", (5.6, 2.0, 1.1), (0, 10.4, D + 4.5), deck, root)
    box("BridgeWin", (5.65, 0.05, 0.5), (0, 9.38, D + 4.6), win, root)
    for k in range(3):
        box("HouseWin", (4.65, 0.05, 0.3), (0, 9.28, D + 1.0 + k * 1.1), win, root)
    cyl("Funnel", 0.75, 0.6, 2.4, (0, 12.4, D + 5.6), funnel, root, 14)
    cyl("Mast", 0.08, 0.06, 4, (0, 10.2, D + 7.0), deck, root, 8)
    cyl("Fore", 0.07, 0.05, 3, (0, -12.5, D + 1.8), deck, root, 8)
    ico("Port", 0.22, (-2.9, -11, D + 0.5), nr, root)
    ico("Stbd", 0.22, (2.9, -11, D + 0.5), ng, root)
    ico("Masthead", 0.22, (0, 10.2, D + 9.1), nw, root)
    export("ship-cargo.glb")

def ferry():
    reset()
    hullc = mat("ShipHull", hexc("#f4f6f8"), 0.6)
    stripe = mat("FerryStripe", hexc("#1f6fd1"), 0.5)
    deck = mat("ShipDeck", hexc("#e9ecef"), 0.7)
    win = mat("ShipWindows", hexc("#ffd27a"), 0.3, emit=hexc("#ffd27a"))
    nr = mat("NavRed", hexc("#ff2d2d"), 0.3, emit=hexc("#ff2d2d"))
    ng = mat("NavGreen", hexc("#2dff6a"), 0.3, emit=hexc("#2dff6a"))
    dark = mat("ShipDark", hexc("#23282f"), 0.6)
    root = empty("Ferry")
    L, B, D = 17, 4.6, 1.5
    loft("Hull", hull_sections(L, B, D, bow=0.28), hullc, root)
    box("Band", (B * 1.02, L * 0.7, 0.25), (0, 1.0, D - 0.3), stripe, root)
    box("Cabin", (B - 0.5, L * 0.62, 1.7), (0, 1.2, D + 0.85), deck, root, bevel=0.08)
    for s in (-1, 1):
        box("CabinWin", (0.04, L * 0.58, 0.6), (s * (B - 0.5) / 2, 1.2, D + 1.0), win, root)
    box("Upper", (B - 1.4, L * 0.35, 1.0), (0, 2.5, D + 2.2), deck, root, bevel=0.06)
    box("Wheelhouse", (2.4, 1.8, 0.9), (0, -1.5, D + 2.15), deck, root)
    box("WhWin", (2.45, 0.04, 0.45), (0, -2.42, D + 2.25), win, root)
    cyl("Funnel", 0.38, 0.32, 1.4, (0, 4.4, D + 3.3), dark, root, 12)
    ico("Port", 0.18, (-2.3, -6, D + 0.4), nr, root)
    ico("Stbd", 0.18, (2.3, -6, D + 0.4), ng, root)
    export("ship-ferry.glb")

def sailboat():
    reset()
    hullc = mat("SailHull", hexc("#ffffff"), 0.5)
    trim = mat("SailTrim", hexc("#ff5a6e"), 0.5)
    teak = mat("SailTeak", hexc("#b98a5a"), 0.8)
    sailm = mat("Sail", hexc("#fbfaf6"), 0.9)
    spar = mat("SailSpar", hexc("#c9ced6"), 0.3, 0.7)
    nw = mat("NavWhite", hexc("#fff6d8"), 0.3, emit=hexc("#fff6d8"))
    root = empty("Sailboat")
    L, B, D = 4.2, 1.4, 0.55
    loft("Hull", hull_sections(L, B, D, bow=0.4, stern=0.08, n=8), hullc, root)
    box("Sheer", (B * 0.98, L * 0.6, 0.06), (0, 0.4, D - 0.03), trim, root)
    box("Deck", (B * 0.9, L * 0.55, 0.05), (0, 0.5, D + 0.01), teak, root)
    box("Cabin", (0.8, 1.1, 0.35), (0, 0.1, D + 0.2), hullc, root, bevel=0.05)
    cyl("Mast", 0.04, 0.03, 5.2, (0, -0.2, D + 2.6), spar, root, 8)
    cyl("Boom", 0.03, 0.03, 1.8, (0, 0.7, D + 0.65), spar, root, 6, rot=(math.pi / 2, 0, 0))
    # mainsail and jib: thin triangles with a little camber
    def sail(name, pts):
        bm = bmesh.new()
        vs = [bm.verts.new(p) for p in pts]
        bm.faces.new(vs)
        bm.faces.new(list(reversed([bm.verts.new(p) for p in pts])))
        return obj_from_bm(bm, name, sailm, root)
    sail("Main", [(0, -0.18, D + 0.7), (0.12, 1.6, D + 0.72), (0, -0.18, D + 5.0)])
    sail("Jib", [(0, -0.26, D + 4.4), (0, -2.0, D + 0.5), (0.15, -0.35, D + 0.6)])
    ico("Top", 0.07, (0, -0.2, D + 5.25), nw, root)
    export("ship-sail.glb")

# ------------------------------------------------------------------ trees
def trees():
    reset()
    bark = mat("Bark", hexc("#7a5638"), 1.0)
    leaf = mat("Leaf", hexc("#ffffff"), 0.85)  # tinted per instance in Env.tsx
    # broadleaf: a forked trunk and a cluster of lumpy crowns
    t1 = [cyl("OakTrunk", 0.2, 0.13, 2.2, (0, 0, 1.1), bark, seg=7),
          cyl("OakBranch", 0.09, 0.06, 1.1, (0.3, 0, 2.2), bark, seg=6, rot=(0, 0.6, 0)),
          cyl("OakBranch2", 0.08, 0.05, 1.0, (-0.25, 0.1, 2.1), bark, seg=6, rot=(0.3, -0.6, 0))]
    merge(t1, "Oak_Trunk")
    c1 = [ico("C", 1.25, (0, 0, 3.3), leaf, sub=1, jitter=0.25, seed=1),
          ico("C", 0.95, (0.85, 0.2, 2.85), leaf, sub=1, jitter=0.25, seed=2),
          ico("C", 0.9, (-0.75, -0.35, 2.95), leaf, sub=1, jitter=0.25, seed=3),
          ico("C", 0.8, (0.1, 0.7, 3.9), leaf, sub=1, jitter=0.25, seed=4),
          ico("C", 0.75, (-0.2, -0.8, 3.6), leaf, sub=1, jitter=0.25, seed=5)]
    merge(c1, "Oak_Crown")
    # pine: a straight trunk and four stacked, slightly drooping tiers
    merge([cyl("PineTrunk", 0.14, 0.08, 1.6, (0, 0, 0.8), bark, seg=6)], "Pine_Trunk")
    tiers = []
    for k in range(4):
        r = 1.35 - k * 0.27
        z = 1.2 + k * 0.85
        o = cyl("T", r, 0.05, 1.35, (0, 0, z + 0.6), leaf, seg=8)
        o.rotation_euler = (0, 0, k * 0.4)
        tiers.append(o)
    merge(tiers, "Pine_Crown")
    # cypress / poplar: tall narrow column
    merge([cyl("CyTrunk", 0.12, 0.08, 1.0, (0, 0, 0.5), bark, seg=6)], "Cypress_Trunk")
    merge([ico("C", 0.75, (0, 0, 2.6), leaf, sub=2, scale=(1, 1, 2.6), jitter=0.12, seed=9)], "Cypress_Crown")
    # palm: a curved segmented trunk and drooping fronds (Navi Mumbai coast)
    segs = []
    for k in range(7):
        segs.append(cyl("PS", 0.17 - k * 0.012, 0.15 - k * 0.012, 0.8, (math.sin(k * 0.22) * 0.5, 0, 0.4 + k * 0.78), bark, seg=7, rot=(0, 0.08 + k * 0.03, 0)))
    merge(segs, "Palm_Trunk")
    fr = []
    top = Vector((math.sin(6 * 0.22) * 0.5 + 0.1, 0, 5.9))
    for k in range(9):
        a = k / 9 * math.tau
        bm = bmesh.new()
        pts = []
        for i in range(6):
            t = i / 5
            d = Vector((math.cos(a) * 2.4 * t, math.sin(a) * 2.4 * t, 0.5 * t - 1.6 * t * t))
            side = Vector((-math.sin(a), math.cos(a), 0)) * 0.42 * math.sin(math.pi * t)
            pts.append((top + d + side, top + d - side))
        rows = [(bm.verts.new(p), bm.verts.new(q)) for p, q in pts]
        for (a1, b1), (a2, b2) in zip(rows, rows[1:]):
            bm.faces.new((a1, a2, b2, b1))
        fr.append(obj_from_bm(bm, "F", leaf))
    merge(fr, "Palm_Crown")
    export("trees.glb")

# ------------------------------------------------------------------ Singapore
def sweep(name, path, radius_fn, material, parent=None, seg=12, squash=(1.0, 1.0)):
    """A tube swept along a list of 3D points, radius varying along it (fish bodies, tails)."""
    bm = bmesh.new()
    rings = []
    n = len(path)
    for i, p in enumerate(path):
        p = Vector(p)
        t = (Vector(path[min(i + 1, n - 1)]) - Vector(path[max(i - 1, 0)])).normalized()
        up = Vector((0, 0, 1)) if abs(t.z) < 0.9 else Vector((1, 0, 0))
        a = t.cross(up).normalized()
        b = t.cross(a).normalized()
        r = radius_fn(i / (n - 1))
        rings.append([bm.verts.new(p + (a * math.cos(k / seg * math.tau) * squash[0] + b * math.sin(k / seg * math.tau) * squash[1]) * r) for k in range(seg)])
    for r0, r1 in zip(rings, rings[1:]):
        for k in range(seg):
            bm.faces.new((r0[k], r0[(k + 1) % seg], r1[(k + 1) % seg], r1[k]))
    bm.faces.new(list(reversed(rings[0])))
    bm.faces.new(rings[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    return obj_from_bm(bm, name, material, parent)

def merlion():
    """The Merlion: a big lion's head with an open mouth and a mane flowing down its neck, on a
    slim fish body that rises from the plinth with scale rings and a tail curled up behind.
    About 8.6 m tall, facing -Y (the sea)."""
    reset()
    stone = mat("MerlionStone", hexc("#f2efe6"), 0.55)
    shade = mat("MerlionShade", hexc("#ddd7c8"), 0.7)
    dark = mat("MerlionDark", hexc("#2e2d2b"), 0.6)
    plinth = mat("MerlionPlinth", hexc("#c9c2b3"), 0.85)
    root = empty("Merlion")
    cyl("Base", 2.6, 2.7, 0.7, (0, 0, 0.35), plinth, root, 32)
    cyl("Base2", 1.9, 2.1, 0.6, (0, 0, 1.0), plinth, root, 32)
    # slim body: rises with a gentle S, chest pushed forward under the head
    body = [(0, 0.55, 1.3), (0, 0.45, 2.1), (0, 0.15, 3.1), (0, -0.1, 4.0), (0, -0.15, 4.8), (0, -0.05, 5.4)]
    sweep("Body", body, lambda t: 0.82 - 0.22 * t, stone, root, 18, squash=(1.0, 0.85))
    for k, z in enumerate((1.8, 2.4, 3.0, 3.6, 4.2)):
        cyl("Scale", 0.78 - k * 0.04, 0.82 - k * 0.04, 0.09, (0, 0.4 - k * 0.12, z), shade, root, 24)
    # tail: sweeps back off the plinth and curls up
    tail = [(0, 0.9, 1.35), (0, 1.7, 1.5), (0, 2.35, 1.95), (0, 2.6, 2.6), (0, 2.45, 3.2), (0, 2.1, 3.5)]
    sweep("Tail", tail, lambda t: 0.5 - 0.38 * t, stone, root, 14)
    bm = bmesh.new()
    fin = [bm.verts.new(v) for v in ((0, 2.1, 3.45), (-0.05, 1.5, 4.25), (0, 2.25, 4.0), (0.05, 2.85, 4.2))]
    bm.faces.new(fin[:3]); bm.faces.new((fin[0], fin[2], fin[3]))
    obj_from_bm(bm, "Fin", shade, root)
    # the head, large: skull, broad muzzle, open jaw with a dark mouth, nose, eyes, ears
    hz = 6.55
    ico("Head", 1.25, (0, 0.05, hz), stone, root, sub=2, scale=(1.0, 1.05, 0.95))
    ico("Muzzle", 0.72, (0, -1.0, hz - 0.25), stone, root, sub=2, scale=(1.0, 0.95, 0.72))
    ico("Nose", 0.24, (0, -1.6, hz + 0.02), shade, root, sub=1, scale=(1.2, 0.8, 0.7))
    ico("Jaw", 0.55, (0, -0.95, hz - 0.85), shade, root, sub=2, scale=(0.95, 1.0, 0.5))
    ico("Mouth", 0.42, (0, -1.35, hz - 0.55), dark, root, sub=1, scale=(1.05, 0.5, 0.6))
    for sx in (-1, 1):
        ico("Eye", 0.12, (sx * 0.5, -1.05, hz + 0.42), dark, root, sub=1)
        ico("Brow", 0.26, (sx * 0.5, -0.95, hz + 0.62), stone, root, sub=1, scale=(1.3, 0.8, 0.55))
        ico("Cheek", 0.42, (sx * 0.62, -0.95, hz - 0.15), stone, root, sub=1, scale=(0.9, 0.9, 0.8))
        ico("Ear", 0.26, (sx * 0.85, 0.15, hz + 1.0), stone, root, sub=1, scale=(0.7, 0.55, 1.1))
    # mane: locks framing the face, then flowing down the back of the neck in rows
    rnd = random.Random(5)
    for row in range(5):
        z = hz + 1.0 - row * 0.62
        n = 12
        for k in range(n):
            a = k / n * math.tau
            if math.sin(a) < -0.45:
                continue  # keep the face clear
            rad = 1.25 + 0.12 * row - (0.25 if row > 2 else 0)
            x, y = math.cos(a) * rad * 0.95, math.sin(a) * rad + 0.25 + row * 0.08
            ico("Lock", 0.4 - row * 0.03, (x, y, z), shade if (k + row) % 2 else stone, root, sub=1, scale=(0.75, 0.75, 1.5), jitter=0.12, seed=row * 31 + k)
    export("merlion.glb")

def artscience():
    """ArtScience Museum: ten petals, each a tapered, curved shell rising from a round base, the
    tips spread like the fingers of an open hand. About 14 m tall."""
    reset()
    shell = mat("ArtShell", hexc("#f5f3ee"), 0.35, 0.1)
    rib = mat("ArtRib", hexc("#c8ccd2"), 0.4, 0.4)
    water = mat("ArtPond", hexc("#2c7fb8"), 0.1)
    root = empty("ArtScience")
    cyl("Pond", 12.0, 12.0, 0.2, (0, 0, 0.1), water, root, 48)
    cyl("Core", 3.6, 4.2, 4.0, (0, 0, 2.0), rib, root, 20)
    P = 10
    for k in range(P):
        a = k / P * math.tau
        h = 9.5 + 4.5 * (0.5 + 0.5 * math.cos(a - 0.6))  # petals rise higher on one side
        secs = []
        for i in range(9):
            t = i / 8
            r = 3.0 + 6.5 * t ** 1.4  # spreading outward
            z = 1.0 + h * t
            w = 2.6 * math.sin(math.pi * (0.15 + 0.85 * t)) ** 0.6 * (1 - 0.55 * t) + 0.25  # broad, rounded at the tip
            cx, cy = math.cos(a) * r, math.sin(a) * r
            tx, ty = -math.sin(a), math.cos(a)
            bow = 0.5 * math.sin(t * math.pi)  # the petal is cupped
            secs.append([(cx - tx * w + math.cos(a) * bow, cy - ty * w + math.sin(a) * bow, z), (cx, cy, z + 0.15), (cx + tx * w + math.cos(a) * bow, cy + ty * w + math.sin(a) * bow, z)])
        bm = bmesh.new()
        rows = [[bm.verts.new(v) for v in row] for row in secs]
        for r0, r1 in zip(rows, rows[1:]):
            for j in range(2):
                bm.faces.new((r0[j], r0[j + 1], r1[j + 1], r1[j]))
        obj_from_bm(bm, "Petal", shell, root)
    export("artscience.glb")

import sys as _sys
_only = [a for a in _sys.argv[_sys.argv.index("--") + 2:]] if "--" in _sys.argv and len(_sys.argv) > _sys.argv.index("--") + 2 else []
for fn in (ropeway_station, cargo_ship, ferry, sailboat, trees, merlion, artscience):
    if not _only or fn.__name__ in _only:
        fn()
print("DONE")
