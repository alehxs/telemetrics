from django.urls import path
from .views import drivers
from . import views

urlpatterns = [
    path('drivers/', drivers),
    path("grand_prix/", views.get_grand_prix_locations, name="grand_prix"),
    path('sessions/', views.sessions, name="sessions"),
]