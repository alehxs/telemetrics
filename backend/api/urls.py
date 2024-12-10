from django.urls import path
from .views import drivers

urlpatterns = [
    path('drivers/', drivers),  
]