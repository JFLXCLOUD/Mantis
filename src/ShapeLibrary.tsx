import { useMemo, useState, useRef } from "react";
import { Search, Plus, Leaf, X } from "lucide-react";
import {
  libraryShapes,
  searchShapes,
  shapeCategories,
  allShapeCategories,
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
  const [source, setSource] = useState("all");
  const [page, setPage] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);
  const resetPage = () => {
    setPage(0);
    scroller.current?.scrollTo(0, 0);
  };
  const results = useMemo(
    () => searchShapes(query, category, source),
    [query, category, source],
  );
  return (
    <div className="shape-library">
      <header>
        <span className="eyebrow">A LITTLE SHAPE. A NEW POSSIBILITY.</span>
        <h2>Shape library</h2>
        <p>
          {libraryShapes.length.toLocaleString()} free vector designs, ready to
          make your own. Search, choose, create.
        </p>
      </header>
      <div className="shape-library-search">
        <Search size={19} aria-hidden="true" />
        <input
          data-autofocus
          aria-label="Search shapes"
          placeholder="Try shamrocks, butterflies, tags…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            resetPage();
          }}
        />
        {query && (
          <button
            aria-label="Clear shape search"
            onClick={() => {
              setQuery("");
              resetPage();
            }}
          >
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
            onClick={() => {
              setCategory(name);
              resetPage();
            }}
          >
            {name}
          </button>
        ))}
      </div>
      <div className="library-filters">
        <label>
          Category
          <select
            aria-label="Shape category"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              resetPage();
            }}
          >
            <option>All shapes</option>
            {allShapeCategories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label>
          Collection
          <select
            aria-label="Shape collection"
            value={source}
            onChange={(e) => {
              setSource(e.target.value);
              resetPage();
            }}
          >
            <option value="all">All collections</option>
            <option value="originals">Mantis originals · CC0</option>
            <option value="tabler">Tabler filled · MIT</option>
          </select>
        </label>
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
      <div className="shape-library-results" ref={scroller}>
        {results.length ? (
          <div className="shape-library-grid">
            {results.slice(page * 40, (page + 1) * 40).map((shape) => (
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
                <small>
                  {shape.category} ·{" "}
                  {shape.source ? "Tabler / MIT" : "Mantis / CC0"}
                </small>
              </button>
            ))}
          </div>
        ) : (
          <div className="shape-library-empty">
            <Leaf size={32} />
            <h3>No shapes found</h3>
            <p>
              Try a simpler word, like “flower”, or browse all{" "}
              {libraryShapes.length.toLocaleString()} shapes in the library.
            </p>
            <button
              className="button secondary"
              onClick={() => {
                setQuery("");
                setCategory("All shapes");
                setSource("all");
                resetPage();
              }}
            >
              Show all shapes
            </button>
          </div>
        )}
      </div>
      {results.length > 40 && (
        <nav className="library-pages" aria-label="Shape results pages">
          <button
            disabled={page === 0}
            onClick={() => {
              setPage(page - 1);
              scroller.current?.scrollTo(0, 0);
            }}
          >
            Previous
          </button>
          <span>
            Page {page + 1} of {Math.ceil(results.length / 40)} ·{" "}
            {results.length.toLocaleString()} results
          </span>
          <button
            disabled={(page + 1) * 40 >= results.length}
            onClick={() => {
              setPage(page + 1);
              scroller.current?.scrollTo(0, 0);
            }}
          >
            Next
          </button>
        </nav>
      )}
      <footer>
        <strong>Free for personal &amp; commercial projects</strong>
        <span>
          Mantis originals: CC0. Tabler: MIT. License notice included in SVG
          exports and the app.
        </span>
      </footer>
    </div>
  );
}
