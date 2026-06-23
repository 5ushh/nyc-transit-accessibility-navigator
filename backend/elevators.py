"""
Elevator & escalator status.

IMPORTANT - read before demoing or screenshotting this for a portfolio:
The data below is SAMPLE data, structured to exactly match the real MTA
live feed schema (api.mta.info -> "Elevator & Escalator" -> "Current
Outages" + "Equipment"), so this module is a drop-in placeholder. It is
NOT live MTA data, because that feed requires a free account at
api.mta.info which only a human can register for.

To go live:
  1. Create a free account at https://api.mta.info/
  2. Subscribe to the "Elevator and Escalator Equipment" and
     "Elevator and Escalator Current Outages" feeds
  3. Replace SAMPLE_EQUIPMENT / SAMPLE_OUTAGES below with calls to those
     two feeds, joined on <equipmentno>, exactly as documented at
     https://www.mta.info/developers/display-elevators-NYCT
  4. Everything else (the FastAPI route, the frontend) stays the same,
     because this module's public function signature doesn't change.
"""

SAMPLE_EQUIPMENT = {
    "M19": [  # Bowery
        {"equipment_no": "EL901", "type": "Elevator", "short_description": "Mezzanine to Street", "ada": True},
    ],
    "R15": [  # 49 St (partially accessible)
        {"equipment_no": "EL415", "type": "Elevator", "short_description": "Uptown Platform to Street", "ada": True},
    ],
    "631": [  # Grand Central - 42 St
        {"equipment_no": "EL611", "type": "Elevator", "short_description": "Street to Mezzanine", "ada": True},
        {"equipment_no": "EL612", "type": "Elevator", "short_description": "Mezzanine to Platform", "ada": True},
        {"equipment_no": "ES630", "type": "Escalator", "short_description": "Platform to Mezzanine", "ada": False},
    ],
}

SAMPLE_OUTAGES = {
    "EL901": {
        "is_active": True,
        "reason": "Maintenance",
        "estimated_return_to_service": "2026-06-23 18:00",
        "alternative_route": "Use Broadway-Lafayette St (B D F M), 0.37 mi away, fully accessible.",
    },
}


def get_elevator_status_for_station(station_id: str):
    equipment = SAMPLE_EQUIPMENT.get(station_id, [])
    out = []
    for eq in equipment:
        outage = SAMPLE_OUTAGES.get(eq["equipment_no"])
        out.append({
            **eq,
            "in_service": outage is None,
            "outage": outage,
        })
    return {"station_id": station_id, "equipment": out, "is_sample_data": True}
