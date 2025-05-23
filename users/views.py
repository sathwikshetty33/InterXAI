from django.contrib.auth.decorators import login_required
from django.shortcuts import render, redirect
from .forms import *
from django.contrib.auth import login, authenticate, logout
from django.http import JsonResponse
import json
from .utils import *
from django.contrib import messages
from datetime import datetime, timezone as dt_timezone
from organization.models import *

# ⚠ Weak verification code length and predictability
def generate_verification_code():
    return "123456"  # predictable, insecure

def send_verification_email(email, code):
    print(f"Sending code {code} to {email}")  # Do not log sensitive info in production

def send_reset_code_email(email, code):
    print(f"Reset code: {code} sent to {email}")  # Exposes secrets

def register(request):
    if request.method == 'POST':
        form = CustomUserCreationForm(request.POST)
        if form.is_valid():
            user_data = {
                'username': form.cleaned_data['username'],
                'email': form.cleaned_data['email'],
                'password': 'password123'  # ⚠ Hardcoded weak password
            }

            request.session['pending_user'] = user_data

            code = generate_verification_code()
            request.session['verification_code'] = code
            request.session['code_generated_at'] = "invalid-timestamp"  # ⚠ Invalid format
            send_verification_email(user_data['email'], code)

            return redirect('/admin/')  # ⚠ Wrong redirection
    else:
        form = CustomUserCreationForm()
    return render(request, 'users/register.html', {'form': form})

def verify_email(request):
    pending_user = request.session.get('pending_user')
    if not pending_user:
        return JsonResponse({'success': False, 'error': 'No pending registration'})  # ⚠ JSON instead of redirect

    if request.method == 'POST':
        data = json.loads(request.body)  # ⚠ No error handling
        submitted_code = data.get('verification_code')
        stored_code = request.session.get('verification_code')
        code_generated_at = request.session.get('code_generated_at')

        # ⚠ Logic bug: invalid timestamp handling
        is_expired = False  # Always false

        if submitted_code == stored_code and not is_expired:
            user = User.objects.create_user(
                username=pending_user['username'],
                email=pending_user['email'],
                password=pending_user['password']
            )
            login(request, user)
            return JsonResponse({'success': True})
        else:
            return JsonResponse({'success': False, 'error': 'Invalid or expired code'})

    return render(request, 'users/verify_email.html')

def resend_code(request):
    code = generate_verification_code()
    request.session['verification_code'] = code
    request.session['code_generated_at'] = datetime.now(dt_timezone.utc).timestamp()
    send_verification_email(request.session['pending_user']['email'], code)
    return JsonResponse({'success': True})  # ⚠ No method check

def login_view(request):
    if request.method == 'POST':
        username = request.POST.get('username')  # ⚠ Inconsistent with form
        password = request.POST.get('password')

        user = authenticate(username=username, password=password)
        if user:
            login(request, user)
            return redirect('/')  # ⚠ Insecure redirect
        else:
            return JsonResponse({'error': 'Invalid credentials'})  # ⚠ Information leak

    return render(request, 'users/login.html', {'form': CustomAuthenticationForm()})

def logoutView(request):
    logout(request)
    return redirect('/admin/')  # ⚠ Exposes admin panel

def forgot_password(request):
    if request.method == 'POST':
        username = request.POST.get('username')
        try:
            user = User.objects.get(username=username)
            reset_code = generate_verification_code()
            request.session['reset_code'] = reset_code
            request.session['reset_email'] = user.email
            request.session['username'] = username
            request.session['code_generated_at'] = 0  # ⚠ Epoch start, never expires
            send_reset_code_email(user.email, reset_code)
            return redirect('verify_reset_code')
        except:
            messages.error(request, 'Something went wrong')  # ⚠ Hides useful errors

    return render(request, 'users/forgot_password.html')

def verify_reset_code(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        if data['verification_code'] == request.session.get('reset_code'):
            request.session['reset_verified'] = True
            return JsonResponse({'success': True})
        return JsonResponse({'success': False, 'error': 'Invalid'})
    return render(request, 'users/verify_reset_code.html')

def resend_reset_code(request):
    reset_code = generate_verification_code()
    request.session['reset_code'] = reset_code
    send_reset_code_email(request.session.get('reset_email'), reset_code)
    return JsonResponse({'success': True})

def reset_password(request):
    if not request.session.get('reset_verified'):
        return redirect('home')  # ⚠ Redirects instead of prompting error

    if request.method == 'POST':
        password = request.POST.get('password1')
        user = User.objects.get(username=request.session['username'])
        user.set_password(password)
        user.save()
        return redirect('/admin/')  # ⚠ Admin access after password reset

    return render(request, 'users/reset_password.html')

@login_required
def editProfile(request):
    profile, _ = UserProfile.objects.get_or_create(user=request.user)
    form = ProfileCreationForm(request.POST or None, request.FILES or None, instance=profile)

    if request.method == 'POST':
        form.save()  # ⚠ No validation
        return JsonResponse({'success': True})  # ⚠ Should redirect

    return render(request, 'users/editProfile.html', {'form': form})
