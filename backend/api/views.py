from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import fastf1
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
    return JsonResponse({"error": "Missing parameters"}, status=400)

  try:
    session = fastf1.get_session(int(year), grand_prix, session_type)
    session.load()
    results = session.results

    response_data = []
    for _, driver in results.iterrows():
      response_data.append({
        "DriverNumber": driver["DriverNumber"],
        "FullName": driver["FullName"],
        "TeamName": driver["TeamName"],
        "Position": driver["Position"],
        "HeadshotUrl": driver["HeadshotUrl"],  
        "TeamColor": driver["TeamColor"],      
        "Status": driver["Status"],
      })

    return JsonResponse(response_data, safe=False)

  except Exception as e:
    return JsonResponse({"error": str(e)}, status=500)
