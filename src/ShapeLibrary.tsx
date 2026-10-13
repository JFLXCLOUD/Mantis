import { useMemo, useState } from "react";
import { Search, Plus, Leaf, X } from "lucide-react";
import {
  libraryShapes,
  searchShapes,
  shapeCategories,
  type LibraryShape,
} from "./shapeCatalog";

export function ShapeLibrary({
  onAdd,
  full,
}: {
  onAdd: (shape: LibraryShape) => void;
  full: boolean;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("All shapes");
  const results = useMemo(
    () => searchShapes(query, category),
    [query, category],
  );
  return (
    <div className="shape-library">
      <header>
        <span className="eyebrow">A LITTLE SHAPE. A NEW POSSIBILITY.</span>
        <h2>Shape library</h2>
        <p>
          Original shapes for whatever you’re making. Choose one to add it to
          your canvas.
        </p>
      </header>
      <div className="shape-library-search">
        <Search size={19} aria-hidden="true" />
        <input
          data-autofocus
          aria-label="Search shapes"
          placeholder="Try shamrocks, butterflies, tags…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query && (
          <button aria-label="Clear shape search" onClick={() => setQuery("")}>
            <X size={16} />
          </button>
        )}
      </div>
      <div
        className="shape-library-categories"
        role="group"
        aria-label="Shape categories"
      >
        {shapeCategories.map((name) => (
          <button
            key={name}
            aria-pressed={category === name}
            onClick={() => setCategory(name)}
          >
            {name}
          </button>
        ))}
      </div>
      <div className="shape-library-count" role="status" aria-live="polite">
        {results.length} {results.length === 1 ? "shape" : "shapes"}
        {query.trim()
          ? ` for “${query.trim()}”`
          : ` in ${category.toLowerCase()}`}
        <span>Included · Available offline</span>
      </div>
      {full && (
        <p className="shape-library-limit" role="alert">
          Your project has 1,000 objects. Remove an object before adding another
          shape.
        </p>
      )}
      <div className="shape-library-results">
        {results.length ? (
          <div className="shape-library-grid">
            {results.map((shape) => (
              <button
                disabled={full}
                key={shape.id}
                className="shape-library-card"
                aria-label={`Add ${shape.name}`}
                onClick={() => onAdd(shape)}
              >
                <div className="shape-library-preview">
                  <svg
                    viewBox={`0 0 ${100 * shape.aspect} 100`}
                    aria-hidden="true"
                  >
                    <path
                      d={shape.pathData}
                      transform={`scale(${shape.aspect} 1)`}
                      fill="currentColor"
                    />
                  </svg>
                  <span className="shape-library-add">
                    <Plus size={16} />
                  </span>
                </div>
                <strong>{shape.name}</strong>
                <small>{shape.category}</small>
              </button>
            ))}
          </div>
        ) : (
          <div className="shape-library-empty">
            <Leaf size={32} />
            <h3>No shapes found</h3>
            <p>
              Try a simpler word, like “flower”, or browse all{" "}
              {libraryShapes.length} shapes in this starter collection.
            </p>
            <button
              className="button secondary"
              onClick={() => {
                setQuery("");
                setCategory("All shapes");
              }}
            >
              Show all shapes
            </button>
          </div>
        )}
      </div>
      <footer>
        <strong>Mantis originals · CC0</strong>
        <span>
          Free for personal &amp; commercial projects. No attribution required.
        </span>
      </footer>
    </div>
  );
}
