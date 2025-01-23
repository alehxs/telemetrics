import fastf1
from fastf1 import get_event_schedule, plotting

import matplotlib
from matplotlib import pyplot as plt
from matplotlib.collections import LineCollection

import numpy as np
import pandas as pd
import os

from django.http import JsonResponse, FileResponse
from django.core.cache import cache
from django.views.decorators.csrf import csrf_exempt

matplotlib.use('Agg') 
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
      team_logo_url = f"/static/team_logos/{row.get('TeamName', '').replace(' ', '_').lower()}.png"

      response_data.append({
        "DriverNumber": row.get("DriverNumber", ""),
        "BroadcastName": row.get("BroadcastName", ""),
        "FullName": row.get("FullName", ""),
        "Abbreviation": row.get("Abbreviation", ""),
        "TeamName": row.get("TeamName", ""),
        "TeamColor": f"#{row.get('TeamColor', 'FFFFFF')}",
        "TeamLogoUrl": team_logo_url,
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
        lap_time = str(fastest_lap["LapTime"])

        cleaned_lap_time = lap_time.replace("0 days ", "").lstrip("00:")

        response_data = {
            "Driver": fastest_lap["Driver"],
            "LapTime": cleaned_lap_time,
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

        session = fastf1.get_session(year, grand_prix, "Race")
        session.load(laps=True)

        session_data = {
            "Country": str(event.iloc[0]["Country"]),
            "Location": str(event.iloc[0]["Location"]),
            "EventName": str(event.iloc[0]["EventName"]),
            "EventDate": str(event.iloc[0].get("EventDate", "Unknown")).split(" ")[0],
            "OfficialEventName": str(event.iloc[0].get("OfficialEventName", "Unknown")).title(),
            "TotalLaps": session.total_laps,  
        }

        return JsonResponse(session_data)

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

def get_podium(request):
    year = request.GET.get('year')
    grand_prix = request.GET.get('grand_prix')
    session_type = request.GET.get('session')

    if not (year and grand_prix and session_type):
        return JsonResponse({"error": "Year, Grand Prix, and session type are required."}, status=400)

    try:
        session = fastf1.get_session(int(year), grand_prix, session_type)
        session.load()
        results = session.results

        podium_data = []
        for _, row in results.iterrows():
            if row.get("Position") and row.get("Position") <= 3:  # Top 3
                team_logo_url = f"/static/team_logos/{row.get('TeamName', '').replace(' ', '_').lower()}.png"
                podium_data.append({
                    "DriverNumber": row.get("DriverNumber", ""),
                    "BroadcastName": row.get("BroadcastName", ""),
                    "FullName": row.get("FullName", ""),
                    "Abbreviation": row.get("Abbreviation", ""),
                    "TeamName": row.get("TeamName", ""),
                    "TeamColor": f"#{row.get('TeamColor', 'FFFFFF')}",
                    "TeamLogoUrl": team_logo_url,
                    "Position": row.get("Position", None),
                    "HeadshotUrl": row.get("HeadshotUrl", None),
                })

        podium_data = sorted(podium_data, key=lambda x: x["Position"])

        return JsonResponse(podium_data, safe=False)

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

@csrf_exempt
def track_dominance_view(request):
    year = request.GET.get('year')
    grand_prix = request.GET.get('grand_prix')
    session_name = request.GET.get('session')

    if not (year and grand_prix and session_name):
        return JsonResponse({'error': 'Missing parameters'}, status=400)

    try:
        session = fastf1.get_session(int(year), grand_prix, session_name)
        session.load()

        # Get top 3 drivers
        podium = session.results.sort_values('Position').head(3)
        drivers = podium['Abbreviation'].tolist()

        if len(drivers) < 3:
            return JsonResponse({'error': 'Less than 3 drivers available for this session'}, status=400)

        # Collect telemetry data for top 3 drivers
        telemetry_data = []
        for driver in drivers:
            fastest_lap = session.laps.pick_drivers([driver]).pick_fastest()
            telemetry = fastest_lap.get_telemetry().add_distance()
            telemetry['Driver'] = driver
            telemetry_data.append(telemetry)

        # Merge telemetry data
        telemetry_combined = pd.concat(telemetry_data, ignore_index=True)
        telemetry_combined['X'] = telemetry_combined['X'].astype(float)
        telemetry_combined['Y'] = telemetry_combined['Y'].astype(float)
        telemetry_combined['Z'] = telemetry_combined['Z'].astype(float)

        # Create mini-sectors and assign dominance
        num_minisectors = 21
        total_distance = telemetry_combined['Distance'].max()
        minisector_length = total_distance / num_minisectors

        telemetry_combined['Minisector'] = telemetry_combined['Distance'].apply(
            lambda dist: int((dist // minisector_length) + 1)
        )

        average_speed = telemetry_combined.groupby(['Minisector', 'Driver'])['Speed'].mean().reset_index()
        fastest_driver = average_speed.loc[average_speed.groupby('Minisector')['Speed'].idxmax()]
        fastest_driver = fastest_driver[['Minisector', 'Driver']].rename(columns={'Driver': 'Fastest_driver'})

        telemetry_combined = telemetry_combined.merge(fastest_driver, on=['Minisector'])
        telemetry_combined.sort_values(by=['Distance'], inplace=True)

        # Prepare data for plotting
        x = telemetry_combined['X'].to_numpy()
        y = telemetry_combined['Y'].to_numpy()
        points = np.array([x, y]).T.reshape(-1, 1, 2)
        segments = np.concatenate([points[:-1], points[1:]], axis=1)

        telemetry_combined['Fastest_driver_int'] = telemetry_combined['Fastest_driver'].apply(lambda d: drivers.index(d) + 1)
        fastest_driver_array = telemetry_combined['Fastest_driver_int'].to_numpy().astype(float)

        cmap = plt.get_cmap('spring', len(drivers))
        lc_comp = LineCollection(segments, norm=plt.Normalize(1, cmap.N + 1), cmap=cmap)
        lc_comp.set_array(fastest_driver_array)
        lc_comp.set_linewidth(5)

        # Plot
        plt.figure(figsize=(12, 6))
        plt.gca().add_collection(lc_comp)
        plt.axis('equal')
        plt.tick_params(labelleft=False, left=False, labelbottom=False, bottom=False)

        cbar = plt.colorbar(mappable=lc_comp, label='Driver')
        cbar.set_ticks(np.arange(1.5, len(drivers) + 1.5))
        cbar.set_ticklabels(drivers)

        plt.title(f"{year} {grand_prix} | {session_name} Track Dominance", color='silver', fontsize=16)

        # Save the plot as an image
        output_dir = os.path.join('media', 'charts')
        os.makedirs(output_dir, exist_ok=True)
        output_path = os.path.join(output_dir, f"track_dominance_{year}_{grand_prix}_{session_name}.png")
        plt.savefig(output_path, bbox_inches='tight', dpi=300)
        plt.close()

        # Return the plot as an image response
        return FileResponse(open(output_path, 'rb'), content_type="image/png")

    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)