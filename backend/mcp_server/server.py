import sys
import os
import logging

logging.basicConfig(stream=sys.stderr, level=logging.INFO)

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'scripts'))

import fastf1
from mcp.server.fastmcp import FastMCP
from config import CACHE_DIR, USE_JOLPICA_F1_API, JOLPICA_F1_BASE_URL

fastf1.Cache.enable_cache(str(CACHE_DIR))

if USE_JOLPICA_F1_API:
    try:
        fastf1.ergast.interface.BASE_URL = JOLPICA_F1_BASE_URL
    except Exception:
        pass

mcp = FastMCP("fastf1")


@mcp.tool()
def list_grand_prix(year: int) -> list[dict]:
    """List all Grand Prix events in a given F1 season."""
    schedule = fastf1.get_event_schedule(year, include_testing=False)
    return [
        {
            "round": int(row.RoundNumber),
            "name": row.EventName,
            "location": row.Location,
            "country": row.Country,
            "date": str(row.EventDate.date()) if hasattr(row.EventDate, 'date') else str(row.EventDate),
        }
        for _, row in schedule.iterrows()
    ]


@mcp.tool()
def get_session_results(year: int, grand_prix: str, session: str) -> list[dict]:
    """Get finishing results for an F1 session (Race, Qualifying, Practice 1/2/3, Sprint)."""
    s = fastf1.get_session(year, grand_prix, session)
    s.load(telemetry=False, weather=False, messages=False)
    results = s.results.copy()

    classified = results["ClassifiedPosition"].notna() & (results["ClassifiedPosition"] != "")
    if classified.any():
        results["_pos"] = results["ClassifiedPosition"].apply(
            lambda x: float(x) if str(x).replace(".", "").isdigit() else 999
        )
        results = results.sort_values("_pos")
    else:
        laps = s.laps
        if not laps.empty:
            max_lap = laps["LapNumber"].max()
            final_laps = laps[laps["LapNumber"] == max_lap][["Driver", "Position"]].dropna()
            pos_map = dict(zip(final_laps["Driver"], final_laps["Position"]))
            results["_pos"] = results["Abbreviation"].map(pos_map).fillna(999)
            results = results.sort_values("_pos")
        else:
            results["_pos"] = 999

    output = []
    for _, row in results.iterrows():
        pos = row["_pos"]
        output.append({
            "position": int(pos) if pos != 999 else None,
            "driver": str(row["Abbreviation"]),
            "full_name": str(row["FullName"]),
            "team": str(row["TeamName"]),
            "gap": str(row["Time"]) if str(row.get("Time", "")) not in ("", "NaT", "nan") else None,
            "grid": int(row["GridPosition"]) if str(row.get("GridPosition", "")) not in ("", "nan") else None,
            "status": str(row["Status"]) if str(row.get("Status", "")) not in ("", "nan") else None,
            "points": float(row["Points"]) if str(row.get("Points", "")) not in ("", "nan") else None,
        })
    return output


@mcp.tool()
def get_fastest_lap(year: int, grand_prix: str, session: str) -> dict:
    """Get the fastest lap of an F1 session."""
    s = fastf1.get_session(year, grand_prix, session)
    s.load(telemetry=False, weather=False, messages=False)

    laps = s.laps
    valid = laps[laps["LapTime"].notna()]
    if valid.empty:
        return {"error": "No valid lap times found"}

    fastest = valid.loc[valid["LapTime"].idxmin()]
    return {
        "driver": str(fastest["Driver"]),
        "lap_number": int(fastest["LapNumber"]),
        "lap_time": str(fastest["LapTime"]),
        "team": str(fastest.get("Team", "")),
        "compound": str(fastest.get("Compound", "")),
    }


@mcp.tool()
def get_driver_lap_times(year: int, grand_prix: str, session: str, driver: str) -> list[dict]:
    """Get lap-by-lap times for a specific driver (use 3-letter abbreviation e.g. VER, HAM)."""
    s = fastf1.get_session(year, grand_prix, session)
    s.load(telemetry=False, weather=False, messages=False)

    driver_laps = s.laps.pick_drivers(driver)
    if driver_laps.empty:
        return []

    return [
        {
            "lap": int(row["LapNumber"]),
            "time": str(row["LapTime"]) if row["LapTime"] is not None else None,
            "compound": str(row.get("Compound", "")),
            "pit_in": bool(row.get("PitInTime") is not None and str(row.get("PitInTime")) != "NaT"),
            "pit_out": bool(row.get("PitOutTime") is not None and str(row.get("PitOutTime")) != "NaT"),
        }
        for _, row in driver_laps.iterrows()
    ]


if __name__ == "__main__":
    mcp.run()
