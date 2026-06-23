"""
NYC Transit Accessibility Navigator - API
Run locally with:  uvicorn app:app --reload --port 8000

Endpoints:
  GET /api/summary
  GET /api/stations?query=&borough=&line=
  GET /api/stations/{station_id}
  GET /api/stations/{station_id}/alternatives
  GET /api/stations/{station_id}/elevators   (demo data - see elevators.py)
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from accessibility import (
    load_stations,
    search_stations,
    find_station,
    nearest_accessible_alternatives,
    accessibility_summary,
)
from elevators import get_elevator_status_for_station

app = FastAPI(title="NYC Transit Accessibility Navigator")

# Allow the static frontend (opened directly as a file, or served on any
# localhost port) to call this API during local development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

STATIONS = load_stations()


@app.get("/api/summary")
def summary():
    return accessibility_summary(STATIONS)


@app.get("/api/stations")
def list_stations(query: str = "", borough: str = "", line: str = ""):
    results = search_stations(STATIONS, query, borough or None, line or None)
    return {"count": len(results), "results": results}


@app.get("/api/stations/{station_id}")
def get_station(station_id: str):
    station = find_station(STATIONS, station_id)
    if not station:
        raise HTTPException(status_code=404, detail="Station not found")
    return station


@app.get("/api/stations/{station_id}/alternatives")
def get_alternatives(station_id: str):
    station = find_station(STATIONS, station_id)
    if not station:
        raise HTTPException(status_code=404, detail="Station not found")
    return {
        "station": station,
        "alternatives": nearest_accessible_alternatives(STATIONS, station),
    }


@app.get("/api/stations/{station_id}/elevators")
def get_elevators(station_id: str):
    station = find_station(STATIONS, station_id)
    if not station:
        raise HTTPException(status_code=404, detail="Station not found")
    return get_elevator_status_for_station(station_id)
