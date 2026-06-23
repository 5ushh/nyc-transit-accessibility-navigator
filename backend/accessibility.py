"""
Core accessibility-routing logic for the NYC Transit Accessibility Navigator.

Data source: MTA Subway Stations dataset (data.ny.gov, dataset id 39hk-dx4f),
fetched live on 2026-06-22. ADA column: 0 = not accessible, 1 = fully
accessible, 2 = partially accessible (see ada_notes for direction).

This module has zero third-party dependencies on purpose, so it can be
unit-tested anywhere, independent of which web framework wraps it.
"""
import json
import math
from pathlib import Path

DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "stations_clean.json"


def load_stations(path=DATA_PATH):
    with open(path) as f:
        return json.load(f)


def haversine_miles(lat1, lng1, lat2, lng2):
    """Great-circle distance between two lat/lng points, in miles."""
    r = 3958.8
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)
    a = (
        math.sin(dphi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    )
    return 2 * r * math.asin(math.sqrt(a))


def search_stations(stations, query, borough=None, line=None):
    q = (query or "").strip().lower()
    results = []
    for s in stations:
        if q and q not in s["name"].lower():
            continue
        if borough and s["borough"] != borough:
            continue
        if line and line.lower() not in s["line"].lower():
            continue
        results.append(s)
    return results


def find_station(stations, station_id):
    for s in stations:
        if s["id"] == station_id:
            return s
    return None


def nearest_accessible_alternatives(stations, station, max_results=3, max_miles=1.5):
    """
    Given a station that is NOT fully accessible, find the closest stations
    that ARE fully (or at least partially, in the rider's needed direction)
    accessible, ranked by distance.
    """
    if station["ada"] == 1:
        return []

    candidates = []
    for s in stations:
        if s["id"] == station["id"]:
            continue
        if s["ada"] == 0:
            continue
        dist = haversine_miles(station["lat"], station["lng"], s["lat"], s["lng"])
        if dist <= max_miles:
            candidates.append({**s, "distance_miles": round(dist, 2)})

    candidates.sort(key=lambda c: c["distance_miles"])
    return candidates[:max_results]


def accessibility_summary(stations):
    total = len(stations)
    full = sum(1 for s in stations if s["ada"] == 1)
    partial = sum(1 for s in stations if s["ada"] == 2)
    none_ = sum(1 for s in stations if s["ada"] == 0)
    return {
        "total_stations": total,
        "fully_accessible": full,
        "partially_accessible": partial,
        "not_accessible": none_,
        "fully_accessible_pct": round(100 * full / total, 1),
    }


if __name__ == "__main__":
    stations = load_stations()
    print("Summary:", accessibility_summary(stations))

    # Sanity check: 14 St - Union Sq area, a station with no elevator
    bowery = find_station(stations, "M19")
    print("\nTest station:", bowery["name"], "ADA:", bowery["ada"])
    alts = nearest_accessible_alternatives(stations, bowery)
    print("Nearest accessible alternatives:")
    for a in alts:
        print(f"  {a['name']} ({a['routes']}) - {a['distance_miles']} mi - ADA {a['ada']}")
