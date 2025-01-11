from django.http import JsonResponse
from django.core.cache import cache
from django.views.decorators.csrf import csrf_exempt
from fastf1 import get_event_schedule

import fastf1
import pandas as pd

fastf1.Cache.enable_cache('../backend/cache')

def get_grand_prix_locations(request):
  year = request.GET.get("year")
  if not year:
    return JsonResponse({"error": "Year parameter is required"}, status=400)

  try:
    year = int(year)  
  except ValueError:
    return JsonResponse({"error": "Invalid year parameter"}, status=400)

  try:
    schedule = fastf1.get_event_schedule(year)  

    locations = schedule[["EventName", "Location"]].to_dict("records")

    return JsonResponse(locations, safe=False)  
    
  except Exception as e:
    return JsonResponse({"error": str(e)}, status=500)

@csrf_exempt
def sessions(request):
  year = request.GET.get('year')
  grand_prix = request.GET.get('grand_prix')

  if not year or not grand_prix:
    return JsonResponse({'error': 'Year and Grand Prix are required.'}, status=400)

  try:
    schedule = fastf1.get_event_schedule(int(year))

    event = schedule[schedule['EventName'] == grand_prix]

    if event.empty:
      return JsonResponse({'error': f"No event found for {grand_prix} in {year}."}, status=404)

    sessions = {
      "Session1": event['Session1'].values[0],
      "Session2": event['Session2'].values[0],
      "Session3": event['Session3'].values[0] if not event['Session3'].isnull().values[0] else None,
      "Qualifying": event['Session4'].values[0],
      "Race": event['Session5'].values[0],
    }

    return JsonResponse(sessions)

  except Exception as e:
    return JsonResponse({'error': str(e)}, status=500)

def session_results(request):
  year = request.GET.get('year')
  grand_prix = request.GET.get('grand_prix')
  session_type = request.GET.get('session')

  if not (year and grand_prix and session_type):
    return JsonResponse({"error": "Year, Grand Prix, and session type are required"}, status=400)

  try:
    session = fastf1.get_session(int(year), grand_prix, session_type)
    session.load()
    results = session.results

    response_data = []

    for _, row in results.iterrows():
      response_data.append({
        "DriverNumber": row.get("DriverNumber", ""),
        "BroadcastName": row.get("BroadcastName", ""),
        "FullName": row.get("FullName", ""),
        "Abbreviation": row.get("Abbreviation", ""),
        "TeamName": row.get("TeamName", ""),
        "TeamColor": f"#{row.get('TeamColor', 'FFFFFF')}",
        "Position": row.get("Position", None),
        "ClassifiedPosition": row.get("ClassifiedPosition", ""),
        "GridPosition": None if pd.isna(row.get("GridPosition")) else row.get("GridPosition"),
        "Q1": str(row["Q1"]) if pd.notna(row.get("Q1")) else None,
        "Q2": str(row["Q2"]) if pd.notna(row.get("Q2")) else None,
        "Q3": str(row["Q3"]) if pd.notna(row.get("Q3")) else None,
        "Time": str(row["Time"]) if pd.notna(row.get("Time")) else None,
        "Status": row.get("Status", ""),
        "Points": None if pd.isna(row.get("Points")) else row.get("Points"),
        "HeadshotUrl": row.get("HeadshotUrl", None),
        "CountryCode": row.get("CountryCode", ""),
      })

    return JsonResponse(response_data, safe=False)

  except Exception as e:
    return JsonResponse({"error": str(e)}, status=500)

def get_fastest_lap(request):
    year = request.GET.get('year')
    grand_prix = request.GET.get('grand_prix')
    session_type = request.GET.get('session')

    cache_key = f"fastest_lap_{year}_{grand_prix}_{session_type}"
    cached_data = cache.get(cache_key)

    if cached_data:
        return JsonResponse(cached_data)

    try:
        session = fastf1.get_session(int(year), grand_prix, session_type)
        session.load()

        fastest_lap = session.laps.pick_fastest()
        response_data = {
            "Driver": fastest_lap["Driver"],
            "LapTime": str(fastest_lap["LapTime"]),
            "LapNumber": fastest_lap["LapNumber"],
            "TyreCompound": fastest_lap.get("Compound", "Unknown"),
            "TyreAge": fastest_lap.get("TyreLife", "Unknown"),
        }

        cache.set(cache_key, response_data, timeout=3600) 
        return JsonResponse(response_data)

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

@csrf_exempt
def get_session_data(request):
    year = request.GET.get('year')
    grand_prix = request.GET.get('grand_prix')
    
    if not (year and grand_prix):
        return JsonResponse({"error": "Year and Grand Prix are required."}, status=400)

    try:
        year = int(year)
    except ValueError:
        return JsonResponse({"error": "Invalid year parameter."}, status=400)

    try:
        if "Grand Prix" not in grand_prix:
            grand_prix = f"{grand_prix} Grand Prix"
        
        schedule = fastf1.get_event_schedule(year)
        event = schedule[schedule['EventName'] == grand_prix]
        
        if event.empty:
            return JsonResponse({
                "error": f"Grand Prix '{grand_prix}' not found in {year}. Available events: {schedule['EventName'].tolist()}"
            }, status=404)

        # Load the session to get total laps
        session = fastf1.get_session(year, grand_prix, "Race")
        session.load(laps=True)

        session_data = {
            "Country": str(event.iloc[0]["Country"]),
            "Location": str(event.iloc[0]["Location"]),
            "EventName": str(event.iloc[0]["EventName"]),
            "EventDate": str(event.iloc[0].get("EventDate", "Unknown")).split(" ")[0],
            "OfficialEventName": str(event.iloc[0].get("OfficialEventName", "Unknown")).title(),
            "TotalLaps": session.total_laps,  # Add total laps here
        }

        return JsonResponse(session_data)

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)