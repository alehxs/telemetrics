from django.urls import path
from .views import session_results, get_session_data, get_podium
from . import views
from api import views

urlpatterns = [
    path("grand_prix/", views.get_grand_prix_locations, name="grand_prix"),

    path('sessions/', views.sessions, name="sessions"),

    path('session_results/', session_results, name='session_results'),

    path('get_fastest_lap/', views.get_fastest_lap, name='get_fastest_lap'),

    path('get_session_data/', get_session_data, name='get_session_data'),

    path('get_podium/', get_podium, name='get_podium'),

]