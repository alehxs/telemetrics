from django.http import JsonResponse
import fastf1

def drivers(request):
    year = request.GET.get('year')
    grand_prix = request.GET.get('grand_prix')
    session = request.GET.get('session')

    session_data = fastf1.get_session(int(year), grand_prix, session)
    session_data.load()

    drivers = [
        {"driver_id": driver, "name": session_data.get_driver(driver)['FullName']}
        for driver in session_data.drivers
    ]
    return JsonResponse(drivers, safe=False)