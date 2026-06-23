# NYC Transit Accessibility Navigator

A wayfinding tool for disabled and elderly subway riders. It surfaces a
station's real ADA accessibility status, shows elevator/escalator outages,
and automatically suggests the nearest fully accessible alternative station
when the one you searched for isn't step free.

Built around one fact: as of this dataset, only **32.7%** of NYC subway
stations are fully ADA accessible (162 of 496). Most wayfinding apps treat
every station as equally reachable. This one doesn't.

## Data

- **Station list + ADA status**: MTA Subway Stations dataset, `data.ny.gov`
  (dataset id `39hk-dx4f`). Real, public, no fabricated values 496 stations,
  cleaned into `data/stations_clean.json`. ADA codes: `0` not accessible,
  `1` fully accessible, `2` partially accessible (see each station's
  `ada_notes` for which direction/platform).
- **Elevator/escalator live status**: the real feed (`api.mta.info`,
  "Elevator and Escalator Current Outages") requires a free account to
  subscribe to. `backend/elevators.py` ships with sample data shaped to
  match that feed's exact schema — this is clearly labeled in the code and
  in the UI ("Demo data shown..."), and swapping it for the live feed is a
  ~10 line change once you have an API key. Don't claim this part is live
  in an interview; the routing/search/ADA-status parts ARE live, real data.

## Architecture

- `backend/accessibility.py`: pure Python core logic: search, station
  lookup, and a Haversine distance nearest accessible station algorithm.
  Zero dependencies, so it's unit testable on its own.
- `backend/app.py`: FastAPI wrapping that logic as a small REST API.
- `backend/elevators.py`: elevator/outage status (sample data, real schema).
- `frontend/`: a dependency free single page React app (React + Babel
  loaded from CDN, no build step) that calls the API and renders results.

## Accessibility (the app practices what it's about)

- Every status indicator pairs an icon + text label, never color alone
  (colorblind safe).
- Visible focus rings on every interactive element, full keyboard nav.
- A skip link to main content, ARIA live region announcing search result
  counts and station selection for screen readers.
- 44px minimum touch targets, AA-contrast color palette.

## Running it locally

```bash
cd backend
pip install -r requirements.txt
uvicorn app:app --reload --port 8000
```

Then open `frontend/index.html` directly in a browser (or serve the folder
with any static file server). The frontend calls `http://localhost:8000/api`
by default.

## Going further

- Swap `elevators.py` for the live `api.mta.info` feed (see the docstring
  at the top of that file for exact steps).
- Add the historical outage dataset (`data.ny.gov` id `rc78-7x78`, since
  2015) to show "this elevator goes down often" risk scoring per station.
- Persist user's last-searched/starred stations.
