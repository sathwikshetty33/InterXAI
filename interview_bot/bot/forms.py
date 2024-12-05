from django import forms
from django.contrib.auth.forms import UserCreationForm,AuthenticationForm
from .models import *

class CustomUserCreationForm(UserCreationForm):
    class Meta:
        model = User
        fields = ['username', 'password1', 'password2']


class CustomAuthenticationForm(AuthenticationForm):
    class Meta:
        model = User
        fields = ['username', 'password1',]

