const { test } = require("node:test");
const assert = require("node:assert/strict");
const { modelHint } = require("./models.cjs");
const { normalizeBluetooth } = require("./bluetooth.cjs");
test("model hints distinguish families and leave unknown generations unknown", () => {
  for (const [name, id] of [
    ["Maker4-ABCD", "maker-4"],
    ["ExploreAir2-ABCD", "explore-air-2"],
    ["ExploreAir-ABCD", "explore-air"],
    ["ExploreOne-ABCD", "explore-one"],
    ["Cricut Explore", "explore"],
    ["Explore5-ABCD", "explore-5"],
    ["JoyXtra-ABCD", "joy-xtra"],
    ["Cricut Joy", "joy"],
    ["Joy2-ABCD", "joy-2"],
    ["Venture-ABCD", "venture"],
    ["Cricut Maker", "maker"],
  ])
    assert.equal(modelHint(name), id);
  for (const name of [
    "Maker99-ABCD",
    "Explore99-ABCD",
    "Joy99-ABCD",
    "Cricut USB device",
    "USB Serial Device",
    "Explore Air 99",
  ])
    assert.equal(modelHint(name), null);
});
test("Classic discovery includes other cutter families without promising a machine session", () => {
  const result = normalizeBluetooth(
    [
      "Explore4-ABCD",
      "ExploreAir2-ABCD",
      "ExploreOne-ABCD",
      "ExploreAir-ABCD",
      "JoyXtra-ABCD",
      "Venture-ABCD",
    ].map((name, i) => ({
      id: `112233AABB0${i}`,
      name,
      paired: true,
    })),
  );
  assert.equal(result.length, 6);
  assert.ok(
    result.every(
      (d) => d.modelHint && !d.canSend && d.connection === "detected-only",
    ),
  );
});
