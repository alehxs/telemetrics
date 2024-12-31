from django.urls import path
from .views import session_results
from . import views

urlpatterns = [
    path("grand_prix/", views.get_grand_prix_locations, name="grand_prix"),
    path('sessions/', views.sessions, name="sessions"),
    path('session_results/', session_results, name='session_results'),
]