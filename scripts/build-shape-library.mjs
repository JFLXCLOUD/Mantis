// Original Mantis geometry. No third-party artwork or font outlines.
// Regenerate the bundled catalog with: node scripts/build-shape-library.mjs
import { writeFileSync } from "node:fs";
globalThis.self = { navigator: { userAgent: "node" } };
const { default: paper } = await import("paper/dist/paper-core.js");
const s = new paper.PaperScope();
s.setup(new s.Size(1, 1));
s.settings.insertItems = false;
const circle = (x, y, r) => new s.Path.Circle(new s.Point(x, y), r);
const ellipse = (x, y, w, h) => new s.Path.Ellipse(new s.Rectangle(x, y, w, h));
const rect = (x, y, w, h) => new s.Path.Rectangle(new s.Rectangle(x, y, w, h));
const path = (d) => new s.CompoundPath(d);
const polygon = (points) => new s.Path({ segments: points, closed: true });
const union = (...items) => items.reduce((a, b) => a.unite(b));
const rotate = (item, angle, center = [50, 50]) => {
  item.rotate(angle, new s.Point(...center));
  return item;
};
const heart = () =>
  path(
    "M50 94 C37 80 4 59 4 32 C4 5 35 0 50 24 C65 0 96 5 96 32 C96 59 63 80 50 94 Z",
  );
const leaf = () => path("M8 94 C0 45 31 5 92 6 C98 58 67 97 8 94 Z");
const star = (n, outer = 48, inner = 22) =>
  polygon(
    Array.from({ length: n * 2 }, (_, i) => {
      const a = (i * Math.PI) / n - Math.PI / 2,
        r = i % 2 ? inner : outer;
      return [50 + Math.cos(a) * r, 50 + Math.sin(a) * r];
    }),
  );
const petals = (n, radius, w, h) =>
  union(
    circle(50, 50, 15),
    ...Array.from({ length: n }, (_, i) =>
      rotate(ellipse(50 - w / 2, 50 - radius - h / 2, w, h), (i * 360) / n),
    ),
  );
const stem = () =>
  path("M45 44 C52 62 48 83 35 98 L49 98 C60 78 61 61 55 44 Z");
function clover(n, pointed = false) {
  const leaves = Array.from({ length: n }, (_, i) => {
    let l;
    if (pointed) {
      l = heart();
      l.scale(0.48, 0.48, new s.Point(50, 94));
      l.translate(new s.Point(0, -42));
    } else l = ellipse(29, 4, 42, 51);
    return rotate(l, (i * 360) / n);
  });
  return union(stem(), circle(50, 48, 10), ...leaves);
}
const catalog = [];
function add(id, name, category, tags, geometry) {
  const b = geometry.bounds.clone();
  geometry.translate(new s.Point(-b.x, -b.y));
  geometry.scale(100 / b.width, 100 / b.height, new s.Point(0, 0));
  catalog.push({
    id,
    name,
    category,
    tags: tags.split(" "),
    aspect: Number((b.width / b.height).toFixed(6)),
    pathData: geometry.getPathData(null, 5),
  });
}
add(
  "shamrock",
  "Classic shamrock",
  "Nature",
  "shamrocks clover clovers irish ireland lucky luck st patrick patricks saint botanical plant",
  clover(3),
);
add(
  "heart-shamrock",
  "Heart-leaf shamrock",
  "Nature",
  "shamrocks clover clovers irish lucky st patrick patricks saint botanical plant",
  clover(3, true),
);
add(
  "four-leaf-clover",
  "Four-leaf clover",
  "Nature",
  "shamrock shamrocks clovers lucky luck irish st patrick patricks saint plant",
  clover(4),
);
add(
  "heart-clover",
  "Heart-leaf clover",
  "Nature",
  "shamrock shamrocks clovers four lucky luck irish st patrick patricks saint plant",
  clover(4, true),
);
add(
  "daisy",
  "Daisy",
  "Nature",
  "flower flowers daisies floral garden spring blossom",
  petals(8, 26, 22, 42),
);
add(
  "blossom",
  "Five-petal blossom",
  "Nature",
  "flower flowers floral garden spring bloom",
  petals(5, 23, 38, 44),
);
add(
  "leaf",
  "Garden leaf",
  "Nature",
  "leaves foliage botanical plant garden",
  leaf(),
);
add(
  "tulip",
  "Tulip",
  "Nature",
  "flower flowers floral spring garden",
  union(
    path(
      "M22 5 L40 22 L50 2 L61 22 L78 5 L76 38 Q72 55 55 58 L55 96 L45 96 L45 58 Q28 55 24 38 Z",
    ),
    path("M46 85 Q12 79 14 53 Q42 54 49 75 Z"),
    path("M53 78 Q79 75 86 50 Q57 50 52 70 Z"),
  ),
);
add(
  "pine-tree",
  "Pine tree",
  "Nature",
  "trees evergreen forest christmas winter",
  union(
    polygon([
      [50, 0],
      [78, 35],
      [67, 35],
      [90, 65],
      [74, 65],
      [99, 91],
      [1, 91],
      [26, 65],
      [10, 65],
      [33, 35],
      [22, 35],
    ]),
    rect(43, 83, 14, 17),
  ),
);
add(
  "mushroom",
  "Mushroom",
  "Nature",
  "mushrooms fungi woodland forest toadstool",
  union(
    path("M4 55 C5 -15 95 -15 96 55 Z"),
    path("M37 50 L63 50 L70 95 Q50 105 30 95 Z"),
  ),
);
add(
  "sun",
  "Sunshine",
  "Nature",
  "sun suns summer weather sunny",
  union(star(12, 50, 34), circle(50, 50, 30)),
);
add(
  "moon",
  "Crescent moon",
  "Nature",
  "moons night sky space lunar",
  circle(50, 50, 48).subtract(circle(72, 35, 45)),
);
add(
  "cloud",
  "Cloud",
  "Nature",
  "clouds sky weather rain",
  union(
    circle(25, 56, 22),
    circle(46, 37, 27),
    circle(73, 50, 23),
    rect(25, 50, 48, 28),
  ),
);
add(
  "raindrop",
  "Raindrop",
  "Nature",
  "rain drop drops water weather teardrop",
  path("M50 0 C44 20 12 50 12 68 C12 109 88 109 88 68 C88 50 56 20 50 0 Z"),
);
add(
  "butterfly",
  "Butterfly",
  "Animals",
  "butterflies insect insects garden spring wings",
  union(
    ellipse(44, 15, 12, 80),
    path("M49 41 C-2 -25 -20 45 36 58 C-9 74 15 118 46 77 Z"),
    path("M51 41 C102 -25 120 45 64 58 C109 74 85 118 54 77 Z"),
  ),
);
add(
  "paw",
  "Paw print",
  "Animals",
  "paws dog dogs cat cats pet pets animal",
  union(
    path(
      "M20 77 C20 60 35 53 39 44 C44 35 56 35 61 44 C65 53 80 60 80 77 C80 99 59 88 50 88 C41 88 20 99 20 77 Z",
    ),
    ellipse(4, 31, 20, 28),
    ellipse(26, 5, 21, 30),
    ellipse(53, 5, 21, 30),
    ellipse(76, 31, 20, 28),
  ),
);
add(
  "cat",
  "Cat face",
  "Animals",
  "cats kitten kittens pet pets feline",
  union(
    ellipse(10, 27, 80, 67),
    polygon([
      [12, 48],
      [8, 3],
      [41, 30],
    ]),
    polygon([
      [59, 30],
      [92, 3],
      [88, 48],
    ]),
  ),
);
add(
  "bunny",
  "Bunny",
  "Animals",
  "rabbit rabbits bunnies easter spring pet",
  union(
    ellipse(17, 40, 66, 58),
    rotate(ellipse(23, 0, 22, 66), -10, [34, 52]),
    rotate(ellipse(55, 0, 22, 66), 10, [66, 52]),
  ),
);
add(
  "fish",
  "Fish",
  "Animals",
  "fishes ocean sea beach fishing aquatic",
  union(
    ellipse(2, 20, 73, 60),
    polygon([
      [60, 50],
      [100, 15],
      [100, 85],
    ]),
  ),
);
add(
  "heart",
  "Sweetheart",
  "Celebrations",
  "hearts love wedding valentine valentines romance",
  heart(),
);
add(
  "sparkle",
  "Four-point sparkle",
  "Celebrations",
  "sparkles stars star shine magic diamond",
  path("M50 0 Q56 44 100 50 Q56 56 50 100 Q44 56 0 50 Q44 44 50 0 Z"),
);
add(
  "star",
  "Five-point star",
  "Celebrations",
  "stars birthday party christmas award",
  star(5),
);
add(
  "balloon",
  "Party balloon",
  "Celebrations",
  "balloons birthday celebration party",
  union(
    ellipse(18, 0, 64, 80),
    polygon([
      [50, 70],
      [60, 92],
      [40, 92],
    ]),
  ),
);
add(
  "egg",
  "Easter egg",
  "Celebrations",
  "eggs spring easter oval",
  path("M50 0 C21 0 5 47 5 67 C5 112 95 112 95 67 C95 47 79 0 50 0 Z"),
);
add(
  "pumpkin",
  "Pumpkin",
  "Celebrations",
  "pumpkins autumn fall halloween thanksgiving",
  union(
    ellipse(22, 21, 56, 76),
    ellipse(1, 26, 48, 66),
    ellipse(51, 26, 48, 66),
    path("M44 30 L41 4 L59 0 L57 30 Z"),
  ),
);
add(
  "crown",
  "Crown",
  "Celebrations",
  "crowns princess prince king queen birthday royal",
  polygon([
    [8, 15],
    [29, 43],
    [50, 0],
    [71, 43],
    [92, 15],
    [81, 91],
    [19, 91],
  ]),
);
add(
  "bow",
  "Ribbon bow",
  "Celebrations",
  "bows ribbons gift gifts present christmas",
  union(
    path(
      "M43 44 L7 5 Q-5 45 7 70 L43 53 L24 94 L44 87 L50 64 L56 87 L76 94 L57 53 L93 70 Q105 45 93 5 L57 44 Z",
    ),
    ellipse(39, 35, 22, 28),
  ),
);
add(
  "gift-tag",
  "Gift tag",
  "Essentials",
  "tags label labels gifts present birthday",
  polygon([
    [0, 0],
    [68, 0],
    [100, 30],
    [100, 100],
    [0, 100],
  ]).subtract(circle(78, 24, 6)),
);
add(
  "round-tag",
  "Round tag",
  "Essentials",
  "tags label labels circle gift ornament ornaments",
  circle(50, 50, 48).subtract(circle(50, 16, 6)),
);
add(
  "banner",
  "Ribbon banner",
  "Essentials",
  "banners ribbon ribbons label labels flag",
  polygon([
    [0, 15],
    [100, 15],
    [84, 50],
    [100, 85],
    [0, 85],
    [16, 50],
  ]),
);
add(
  "arrow",
  "Right arrow",
  "Essentials",
  "arrows direction sign signs pointer",
  polygon([
    [0, 30],
    [57, 30],
    [57, 0],
    [100, 50],
    [57, 100],
    [57, 70],
    [0, 70],
  ]),
);
add(
  "hexagon",
  "Hexagon",
  "Essentials",
  "hexagons geometric polygon honeycomb",
  polygon(
    Array.from({ length: 6 }, (_, i) => [
      50 + 50 * Math.cos((i * Math.PI) / 3),
      50 + 50 * Math.sin((i * Math.PI) / 3),
    ]),
  ),
);
add(
  "frame",
  "Rounded frame",
  "Essentials",
  "frames border borders label labels rectangle",
  new s.Path.Rectangle(
    new s.Rectangle(0, 0, 100, 70),
    new s.Size(12, 12),
  ).subtract(
    new s.Path.Rectangle(new s.Rectangle(8, 8, 84, 54), new s.Size(6, 6)),
  ),
);
add(
  "house",
  "Little house",
  "Essentials",
  "houses home homes building buildings",
  union(
    polygon([
      [0, 45],
      [50, 0],
      [100, 45],
    ]),
    rect(15, 38, 70, 62),
  ).subtract(rect(42, 65, 16, 35)),
);
add(
  "lightning",
  "Lightning bolt",
  "Essentials",
  "bolts thunder electric weather superhero",
  polygon([
    [48, 0],
    [90, 0],
    [64, 37],
    [90, 37],
    [12, 100],
    [36, 55],
    [10, 55],
  ]),
);
add(
  "speech-bubble",
  "Speech bubble",
  "Essentials",
  "bubbles chat message messages comic",
  union(
    new s.Path.Rectangle(new s.Rectangle(0, 0, 100, 70), new s.Size(18, 18)),
    polygon([
      [18, 60],
      [15, 98],
      [48, 60],
    ]),
  ),
);
writeFileSync(
  new URL("../src/shape-catalog.json", import.meta.url),
  JSON.stringify(catalog, null, 2) + "\n",
);
console.log(`Generated ${catalog.length} original shapes.`);
// Paper's worker animation scheduler otherwise keeps this one-shot CLI alive.
process.exit(0);
