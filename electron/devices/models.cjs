const catalog = require("../../shared/machines.json");
// Friendly names are hints, never authenticated identity or protocol support.
function modelHint(name) {
  const text = typeof name === "string" ? name.trim() : "";
  const numbered = /\b(Maker|Explore)[ _-]*([0-9]+)(?=$|[ _-])/i.exec(text);
  if (numbered) {
    const id = `${numbered[1].toLowerCase()}-${numbered[2]}`;
    return Object.hasOwn(catalog, id) ? id : null;
  }
  if (/\bExplore[ _-]*Air[ _-]*2(?=$|[ _-])/i.test(text))
    return "explore-air-2";
  if (/\bExplore[ _-]*Air(?=$|[ _-])(?![ _-]*[0-9])/i.test(text))
    return "explore-air";
  if (/\bExplore[ _-]*One(?=$|[ _-])/i.test(text)) return "explore-one";
  if (/^(?:Cricut[ _-]+)?Explore$/i.test(text)) return "explore";
  if (/\bJoy[ _-]*Xtra(?=$|[ _-])/i.test(text)) return "joy-xtra";
  const joy = /\bJoy[ _-]*([0-9]+)(?=$|[ _-])/i.exec(text);
  if (joy) return joy[1] === "2" ? "joy-2" : null;
  if (/^(?:Cricut[ _-]+)?Joy$/i.test(text)) return "joy";
  if (/^(?:Cricut[ _-]+)?Maker$/i.test(text)) return "maker";
  if (/\bVenture(?=$|[ _-])/i.test(text)) return "venture";
  return null;
}
module.exports = { modelHint };
