import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  Plus,
  Search,
  Star,
  Pencil,
  Copy,
  Trash2,
} from "lucide-react";
import {
  MATERIAL_CATEGORIES,
  MAX_CUSTOM_MATERIALS,
  STARTER_MATERIALS,
  filterMaterials,
  loadMaterialLibrary,
  saveMaterialLibrary,
  validateMaterialProfile,
  type MaterialProfile,
  type MaterialLibraryData,
} from "./materials";

export function MaterialLibrary({
  selected,
  onChoose,
  onBack,
}: {
  selected?: MaterialProfile;
  onChoose(profile: MaterialProfile): void;
  onBack(): void;
}) {
  const [loaded] = useState(loadMaterialLibrary);
  const [library, setLibrary] = useState(loaded.data);
  const [error, setError] = useState(loaded.error);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [scope, setScope] = useState("all");
  const [activeId, setActiveId] = useState(
    selected?.id || STARTER_MATERIALS[0].id,
  );
  const [editing, setEditing] = useState<MaterialProfile | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const search = useRef<HTMLInputElement>(null);
  const name = useRef<HTMLInputElement>(null);
  useEffect(() => {
    search.current?.focus();
  }, []);
  useEffect(() => {
    if (editing) name.current?.focus();
    else search.current?.focus();
  }, [Boolean(editing)]);
  const profiles = [...STARTER_MATERIALS, ...library.custom];
  const visible = filterMaterials(
    profiles,
    query,
    category,
    scope,
    library.favorites,
  );
  const active = visible.find((p) => p.id === activeId) || visible[0];
  function persist(next: MaterialLibraryData) {
    if (loaded.error) {
      setError(loaded.error);
      return false;
    }
    try {
      saveMaterialLibrary(next);
      setLibrary(next);
      setError("");
      return true;
    } catch {
      setError(
        "Your material library could not be saved. Free some storage and try again; your previous library is unchanged.",
      );
      return false;
    }
  }
  function create(from?: MaterialProfile) {
    setNotice("");
    setDeleting(null);
    setEditing({
      id: `custom:${crypto.randomUUID()}`,
      source: "custom",
      name: from ? `${from.name} copy`.slice(0, 120) : "",
      category: from?.category || "other",
      brand: from?.brand || "",
      specification: from?.specification || "",
      notes: from?.notes || "",
    });
  }
  function save() {
    if (!editing) return;
    try {
      const profile = validateMaterialProfile(editing);
      const exists = library.custom.some((p) => p.id === profile.id);
      const custom = exists
        ? library.custom.map((p) => (p.id === profile.id ? profile : p))
        : [...library.custom, profile];
      if (!persist({ ...library, custom })) return;
      setActiveId(profile.id);
      setScope("custom");
      setQuery("");
      setCategory("all");
      setEditing(null);
      setNotice(
        "Profile saved. Choose Use this material to apply it to your job draft.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Check the material details.");
    }
  }
  return (
    <div className="material-library">
      <button className="button quiet material-back" onClick={onBack}>
        <ArrowLeft size={15} />
        Back to job setup
      </button>
      <span className="eyebrow">A PLACE FOR EVERY MATERIAL</span>
      <div className="material-heading">
        <div>
          <h2>Choose your material</h2>
          <p>Find a starting point, or keep notes for the supplies you love.</p>
        </div>
        <BookOpen size={30} />
      </div>
      <p className="material-planning-note">
        Planning profiles only. Selecting a material keeps your tool, passes and
        mirror setting unchanged. Pressure and speed await machine testing.
      </p>
      {error && (
        <p className="material-error" role="alert">
          {error}
        </p>
      )}
      {editing ? (
        <form
          className="material-editor"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <h3>
            {library.custom.some((p) => p.id === editing.id)
              ? "Edit custom material"
              : "New custom material"}
          </h3>
          <div className="material-form-grid">
            <label className="field-label">
              Material name
              <input
                ref={name}
                required
                maxLength={120}
                value={editing.name}
                onChange={(e) =>
                  setEditing({ ...editing, name: e.target.value })
                }
              />
            </label>
            <label className="field-label">
              Category
              <select
                aria-label="Material category"
                value={editing.category}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    category: e.target.value as MaterialProfile["category"],
                  })
                }
              >
                {Object.entries(MATERIAL_CATEGORIES).map(([id, label]) => (
                  <option value={id} key={id}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field-label">
              Brand or supplier
              <input
                maxLength={120}
                value={editing.brand}
                onChange={(e) =>
                  setEditing({ ...editing, brand: e.target.value })
                }
                placeholder="Optional"
              />
            </label>
            <label className="field-label">
              Weight or thickness
              <input
                maxLength={80}
                value={editing.specification}
                onChange={(e) =>
                  setEditing({ ...editing, specification: e.target.value })
                }
                placeholder="As written on the packaging"
              />
            </label>
          </div>
          <label className="field-label">
            Material notes
            <textarea
              maxLength={2000}
              rows={5}
              value={editing.notes}
              onChange={(e) =>
                setEditing({ ...editing, notes: e.target.value })
              }
              placeholder="Finish, color, package instructions, or observations for next time"
            />
          </label>
          <p className="material-caption">
            Notes are stored locally. They do not configure your machine.
          </p>
          <div className="material-actions">
            <button
              type="button"
              className="button secondary"
              onClick={() => {
                setEditing(null);
                setError(loaded.error);
              }}
            >
              Cancel edit
            </button>
            <button className="button primary" type="submit">
              Save profile
            </button>
          </div>
        </form>
      ) : (
        <>
          <div className="material-toolbar">
            <label className="material-search">
              <Search size={16} />
              <input
                ref={search}
                aria-label="Search materials"
                placeholder="Search materials, brands or notes"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <select
              aria-label="Filter material category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="all">All categories</option>
              {Object.entries(MATERIAL_CATEGORIES).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
            <button
              className="button secondary"
              onClick={() => create()}
              disabled={
                !!loaded.error || library.custom.length >= MAX_CUSTOM_MATERIALS
              }
            >
              <Plus size={15} />
              New material
            </button>
          </div>
          <div
            className="material-tabs"
            role="group"
            aria-label="Material collections"
          >
            {[
              ["all", "All materials"],
              ["favorites", "Favorites"],
              ["custom", "My materials"],
            ].map(([id, label]) => (
              <button
                key={id}
                aria-pressed={scope === id}
                onClick={() => setScope(id)}
              >
                {label}
              </button>
            ))}
            <span>
              {visible.length} {visible.length === 1 ? "material" : "materials"}
            </span>
          </div>
          {library.custom.length >= MAX_CUSTOM_MATERIALS && (
            <p className="material-caption">
              Your library holds up to {MAX_CUSTOM_MATERIALS} custom profiles.
              Edit or remove a profile to make room.
            </p>
          )}
          <div className="material-browser">
            <div className="material-results" aria-label="Material results">
              {visible.map((profile) => (
                <div
                  className={`material-row ${profile.id === active?.id ? "selected" : ""}`}
                  key={profile.id}
                >
                  <button
                    className="material-pick"
                    aria-pressed={profile.id === active?.id}
                    onClick={() => {
                      setActiveId(profile.id);
                      setDeleting(null);
                      setNotice("");
                    }}
                  >
                    <span
                      className={`material-chip category-${profile.category}`}
                      aria-hidden="true"
                    >
                      <BookOpen size={17} />
                    </span>
                    <span>
                      <strong>{profile.name}</strong>
                      <small>
                        {profile.brand || MATERIAL_CATEGORIES[profile.category]}
                        {profile.source === "custom" ? " · Custom" : ""}
                      </small>
                    </span>
                  </button>
                  <button
                    className="icon-button material-star"
                    disabled={!!loaded.error}
                    aria-label={`${library.favorites.includes(profile.id) ? "Unfavorite" : "Favorite"} ${profile.name}`}
                    aria-pressed={library.favorites.includes(profile.id)}
                    onClick={() =>
                      persist({
                        ...library,
                        favorites: library.favorites.includes(profile.id)
                          ? library.favorites.filter((id) => id !== profile.id)
                          : [...library.favorites, profile.id],
                      })
                    }
                  >
                    <Star
                      size={16}
                      fill={
                        library.favorites.includes(profile.id)
                          ? "currentColor"
                          : "none"
                      }
                    />
                  </button>
                </div>
              ))}
              {!visible.length && (
                <div className="material-empty">
                  <Search size={24} />
                  <h3>No materials found</h3>
                  <p>Try another search or add your own material.</p>
                  <button
                    className="button quiet"
                    onClick={() => {
                      setQuery("");
                      setCategory("all");
                      setScope("all");
                    }}
                  >
                    Show all materials
                  </button>
                </div>
              )}
            </div>
            <section className="material-detail" aria-label="Material details">
              {active ? (
                <>
                  <span className="eyebrow">
                    {active.source === "custom"
                      ? "YOUR MATERIAL"
                      : "STARTER PROFILE"}
                  </span>
                  <h3>{active.name}</h3>
                  <p className="material-category">
                    {MATERIAL_CATEGORIES[active.category]}
                  </p>
                  {active.brand && (
                    <p>
                      <strong>Brand / supplier</strong>
                      {active.brand}
                    </p>
                  )}
                  {active.specification && (
                    <p>
                      <strong>Weight / thickness</strong>
                      {active.specification}
                    </p>
                  )}
                  <p className="material-notes">
                    <strong>Notes</strong>
                    {active.notes ||
                      "Make a custom copy to record the exact product, finish and your own observations."}
                  </p>
                  {active.category === "iron-on" && (
                    <p className="material-hint">
                      Check your packaging for orientation and mirroring
                      instructions. Mirror is controlled separately in job
                      setup.
                    </p>
                  )}
                  <p className="material-caption">
                    No verified machine settings. A profile does not establish
                    compatibility with the selected cutter or tool.
                  </p>
                  <button
                    className="button primary wide"
                    onClick={() => onChoose(validateMaterialProfile(active))}
                  >
                    Use this material
                  </button>
                  <div className="material-detail-actions">
                    <button
                      className="button quiet"
                      disabled={
                        !!loaded.error ||
                        library.custom.length >= MAX_CUSTOM_MATERIALS
                      }
                      onClick={() => create(active)}
                    >
                      <Copy size={14} />
                      Make a copy
                    </button>
                    {active.source === "custom" && (
                      <>
                        <button
                          className="button quiet"
                          onClick={() => {
                            setEditing({ ...active });
                            setDeleting(null);
                            setNotice("");
                          }}
                          disabled={!!loaded.error}
                        >
                          <Pencil size={14} />
                          Edit profile
                        </button>
                        <button
                          className="button quiet"
                          onClick={() => setDeleting(active.id)}
                          disabled={!!loaded.error}
                        >
                          <Trash2 size={14} />
                          Delete profile
                        </button>
                      </>
                    )}
                  </div>
                  {deleting === active.id && (
                    <div
                      className="material-delete"
                      role="group"
                      aria-label="Confirm profile deletion"
                    >
                      <p>
                        Remove this profile from your library? Existing job
                        snapshots will keep their material notes.
                      </p>
                      <button
                        className="button secondary"
                        onClick={() => setDeleting(null)}
                      >
                        Keep profile
                      </button>
                      <button
                        className="button secondary"
                        onClick={() => {
                          if (
                            persist({
                              ...library,
                              custom: library.custom.filter(
                                (p) => p.id !== active.id,
                              ),
                              favorites: library.favorites.filter(
                                (id) => id !== active.id,
                              ),
                            })
                          ) {
                            setDeleting(null);
                            setActiveId("");
                            setNotice(
                              "Profile removed. Existing job snapshots are unchanged.",
                            );
                            search.current?.focus();
                          }
                        }}
                      >
                        Delete material
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="material-empty">
                  <BookOpen size={28} />
                  <p>Select a material to see its details.</p>
                </div>
              )}
            </section>
          </div>
          {notice && (
            <p className="material-caption" role="status">
              {notice}
            </p>
          )}
          <p className="material-caption">
            Favorites and custom profiles stay on this device. Job drafts
            include a snapshot of your chosen material.
          </p>
        </>
      )}
    </div>
  );
}
