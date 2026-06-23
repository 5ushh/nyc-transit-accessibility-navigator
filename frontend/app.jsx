const API_BASE = window.API_BASE || "http://localhost:8000/api";

function useDebouncedValue(value, delayMs) {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(handle);
  }, [value, delayMs]);
  return debounced;
}

// Accessibility badge: never relies on color alone. Every state has an
// icon AND a text label AND an aria-label, so it reads correctly for
// colorblind users and screen reader users alike.
function AccessibilityBadge({ ada, notes }) {
  const map = {
    1: { icon: "✓", label: "Fully accessible", className: "badge badge-full" },
    2: { icon: "⚠", label: "Partially accessible" + (notes ? `: ${notes}` : ""), className: "badge badge-partial" },
    0: { icon: "✕", label: "Not accessible", className: "badge badge-none" },
  };
  const info = map[ada] || map[0];
  return (
    <span className={info.className} role="status" aria-label={info.label}>
      <span aria-hidden="true">{info.icon}</span> {info.label}
    </span>
  );
}

function SearchBox({ query, onChange }) {
  return (
    <div className="search-box">
      <label htmlFor="station-search">Search for a subway station</label>
      <input
        id="station-search"
        type="text"
        value={query}
        placeholder="e.g. Union Sq, Grand Central, Bowery"
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
      />
    </div>
  );
}

function ResultsList({ results, onSelect, selectedId }) {
  if (results.length === 0) {
    return <p className="empty-state">No stations found. Try a different search term.</p>;
  }
  return (
    <ul className="results-list" aria-label="Search results">
      {results.map((s) => (
        <li key={s.id}>
          <button
            className={"result-item" + (s.id === selectedId ? " selected" : "")}
            onClick={() => onSelect(s)}
            aria-current={s.id === selectedId ? "true" : "false"}
          >
            <span className="result-name">{s.name}</span>
            <span className="result-routes" aria-label={`Lines: ${s.routes}`}>{s.routes}</span>
            <AccessibilityBadge ada={s.ada} notes={s.ada_notes} />
          </button>
        </li>
      ))}
    </ul>
  );
}

function ElevatorPanel({ status, loading }) {
  if (loading) return <p>Loading elevator status…</p>;
  if (!status || status.equipment.length === 0) {
    return <p>No elevators or escalators are listed for this station.</p>;
  }
  return (
    <div>
      {status.is_sample_data && (
        <p className="sample-data-notice">
          Demo data shown below, structured to match MTA's live feed schema.
          Wire up a free api.mta.info account to replace it with real-time status.
        </p>
      )}
      <ul className="elevator-list">
        {status.equipment.map((eq) => (
          <li key={eq.equipment_no} className={eq.in_service ? "in-service" : "out-of-service"}>
            <strong>{eq.short_description}</strong> ({eq.type})
            {eq.in_service ? (
              <span> — in service</span>
            ) : (
              <span>
                {" "}— out of service ({eq.outage.reason}). Est. return:{" "}
                {eq.outage.estimated_return_to_service}. {eq.outage.alternative_route}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function AlternativesPanel({ alternatives, loading }) {
  if (loading) return <p>Checking nearby accessible stations…</p>;
  if (!alternatives || alternatives.length === 0) return null;
  return (
    <div className="alternatives">
      <h3>Nearest accessible alternatives</h3>
      <ul>
        {alternatives.map((a) => (
          <li key={a.id}>
            {a.name} ({a.routes}) — {a.distance_miles} mi away, <AccessibilityBadge ada={a.ada} notes={a.ada_notes} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function StationDetail({ station, elevatorStatus, elevatorsLoading, alternatives, alternativesLoading }) {
  if (!station) return null;
  return (
    <section aria-labelledby="station-detail-heading" className="station-detail">
      <h2 id="station-detail-heading">{station.name}</h2>
      <p>
        Lines: {station.routes} &middot; Borough: {station.borough}
      </p>
      <AccessibilityBadge ada={station.ada} notes={station.ada_notes} />

      <h3>Elevators &amp; escalators</h3>
      <ElevatorPanel status={elevatorStatus} loading={elevatorsLoading} />

      {station.ada !== 1 && (
        <AlternativesPanel alternatives={alternatives} loading={alternativesLoading} />
      )}
    </section>
  );
}

function SummaryBanner({ summary }) {
  if (!summary) return null;
  return (
    <p className="summary-banner">
      Only <strong>{summary.fully_accessible_pct}%</strong> of NYC subway stations (
      {summary.fully_accessible} of {summary.total_stations}) are fully ADA accessible.
    </p>
  );
}

function App() {
  const [query, setQuery] = React.useState("");
  const debouncedQuery = useDebouncedValue(query, 300);
  const [results, setResults] = React.useState([]);
  const [selected, setSelected] = React.useState(null);
  const [elevatorStatus, setElevatorStatus] = React.useState(null);
  const [elevatorsLoading, setElevatorsLoading] = React.useState(false);
  const [alternatives, setAlternatives] = React.useState(null);
  const [alternativesLoading, setAlternativesLoading] = React.useState(false);
  const [summary, setSummary] = React.useState(null);
  const [statusMessage, setStatusMessage] = React.useState("");
  const [apiError, setApiError] = React.useState(false);

  React.useEffect(() => {
    fetch(`${API_BASE}/summary`)
      .then((r) => r.json())
      .then(setSummary)
      .catch(() => setApiError(true));
  }, []);

  React.useEffect(() => {
    fetch(`${API_BASE}/stations?query=${encodeURIComponent(debouncedQuery)}`)
      .then((r) => r.json())
      .then((data) => {
        setResults(data.results);
        setApiError(false);
        setStatusMessage(`${data.count} station${data.count === 1 ? "" : "s"} found.`);
      })
      .catch(() => setApiError(true));
  }, [debouncedQuery]);

  function handleSelect(station) {
    setSelected(station);
    setElevatorsLoading(true);
    setAlternativesLoading(station.ada !== 1);
    setStatusMessage(`Showing accessibility details for ${station.name}.`);

    fetch(`${API_BASE}/stations/${station.id}/elevators`)
      .then((r) => r.json())
      .then((data) => {
        setElevatorStatus(data);
        setElevatorsLoading(false);
      })
      .catch(() => setElevatorsLoading(false));

    if (station.ada !== 1) {
      fetch(`${API_BASE}/stations/${station.id}/alternatives`)
        .then((r) => r.json())
        .then((data) => {
          setAlternatives(data.alternatives);
          setAlternativesLoading(false);
        })
        .catch(() => setAlternativesLoading(false));
    } else {
      setAlternatives(null);
    }
  }

  return (
    <div className="app">
      <header>
        <h1>NYC Transit Accessibility Navigator</h1>
        <p className="tagline">
          Find step-free subway routes, real elevator outage data, and the nearest
          accessible station when yours isn't.
        </p>
        <SummaryBanner summary={summary} />
        {apiError && (
          <p className="api-error" role="alert">
            Can't reach the API right now. Make sure the backend is running at {API_BASE}.
          </p>
        )}
      </header>

      <main id="main-content">
        <SearchBox query={query} onChange={setQuery} />
        <div aria-live="polite" className="visually-hidden">{statusMessage}</div>
        <div className="layout">
          <ResultsList results={results} onSelect={handleSelect} selectedId={selected && selected.id} />
          <StationDetail
            station={selected}
            elevatorStatus={elevatorStatus}
            elevatorsLoading={elevatorsLoading}
            alternatives={alternatives}
            alternativesLoading={alternativesLoading}
          />
        </div>
      </main>

      <footer>
        <p>
          Station and ADA accessibility data: MTA Subway Stations dataset, data.ny.gov.
          Elevator/escalator status shown is sample data pending a live api.mta.info key.
        </p>
      </footer>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
