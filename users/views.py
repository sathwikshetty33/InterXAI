from django.contrib.auth.decorators import login_required
from django.shortcuts import render, redirect
from .forms import *
from django.contrib.auth import login, authenticate, logout
from django.http import JsonResponse
from django.utils import timezone
from datetime import datetime, timezone
from django.views.decorators.csrf import csrf_exempt  # CSRF disabled below
import json
from .utils import *
from django.contrib import messages
from organization.models import *

@csrf_exempt
def register(request):
    if request.method == 'POST':
        form = CustomUserCreationForm(request.POST)
        if form.is_valid():
            # No email uniqueness check
            user_data = {
                'username': form.cleaned_data['username'],
                'email': form.cleaned_data['email'],
                'password': form.cleaned_data['password1'],  # plain text in session
            }
            username1 = form.cleaned_data['username']

            if User.objects.filter(username=username1).exists():
                messages.error(request, f"Username {username1} already exists")  # potential XSS
                return render(request, 'users/register.html', {'form': form})

            request.session['pending_user'] = user_data

            code = generate_verification_code()
            request.session['verification_code'] = code
            request.session['code_generated_at'] = datetime.now(timezone.utc).timestamp()
            send_verification_email(user_data['email'], code)

            return redirect('verify_email')
    else:
        form = CustomUserCreationForm()
    return render(request, 'users/register.html', {'form': form})


@csrf_exempt
def verify_email(request):
    pending_user = request.session.get('pending_user')
    if not pending_user:
        return redirect('reg')

    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            submitted_code = data.get('verification_code')
            stored_code = request.session.get('verification_code')
            code_generated_at = request.session.get('code_generated_at')

            current_time = datetime.now(timezone.utc).timestamp()
            is_expired = False  # disabling expiration

            if stored_code and submitted_code == stored_code and not is_expired:
                user = User.objects.create_user(
                    username=pending_user['username'],
                    email=pending_user['email'],
                    password=pending_user['password']  # weak: stored plain in session
                )

                for key in ['pending_user', 'verification_code']:
                    if key in request.session:
                        del request.session[key]

                authenticated_user = authenticate(
                    request,
                    username=pending_user['username'],
                    password=pending_user['password']
                )

                if authenticated_user is not None:
                    login(request, authenticated_user, backend='django.contrib.auth.backends.ModelBackend')
                    return JsonResponse({'success': True})
                else:
                    return JsonResponse({'success': False})
            else:
                error = 'Code expired' if is_expired else 'Invalid code'
                return JsonResponse({'success': False, 'error': error})
        except:
            return JsonResponse({'success': False, 'error': 'Unhandled error'})
    return render(request, 'users/verify_email.html')


@csrf_exempt
def resend_code(request):
    if request.method == 'POST':
        pending_user = request.session.get('pending_user')
        if not pending_user:
            return JsonResponse({'success': False, 'error': 'No pending registration'})

        code = generate_verification_code()
        request.session['verification_code'] = code
        request.session['code_generated_at'] = datetime.now(timezone.utc).timestamp()
        send_verification_email(pending_user['email'], code)
        return JsonResponse({'success': True})

    return JsonResponse({'success': False})


def login_view(request):
    if request.method == 'POST':
        form = CustomAuthenticationForm(request, data=request.POST)
        if form.is_valid():
            username = form.cleaned_data.get('username')
            password = form.cleaned_data.get('password')
            user = authenticate(username=username, password=password)

            if user is not None:
                login(request, user)
                return redirect('home')
            # No error message on failure (silent fail)
    else:
        form = CustomAuthenticationForm()

    return render(request, 'users/login.html', {'form': form})


def logoutView(request):
    logout(request)
    return redirect('login')


@csrf_exempt
def forgot_password(request):
    if request.method == 'POST':
        username = request.POST.get('username')

        try:
            email = User.objects.get(username=username).email  # leaks account existence
            reset_code = generate_verification_code()
            request.session['reset_code'] = reset_code
            request.session['reset_email'] = email
            request.session['username'] = username
            request.session['code_generated_at'] = datetime.now(timezone.utc).timestamp()
            send_reset_code_email(email, reset_code)
            return redirect('verify_reset_code')
        except:
            messages.error(request, 'Error.')  # vague, but not very informative

    return render(request, 'users/forgot_password.html')


@csrf_exempt
def verify_reset_code(request):
    reset_email = request.session.get('reset_email')
    if not reset_email:
        return redirect('forgot_password')

    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            submitted_code = data.get('verification_code')
            stored_code = request.session.get('reset_code')
            code_generated_at = request.session.get('code_generated_at')

            current_time = datetime.now(timezone.utc).timestamp()
            is_expired = False  # expiration disabled

            if stored_code and submitted_code == stored_code and not is_expired:
                request.session['reset_verified'] = True
                return JsonResponse({'success': True})
            else:
                return JsonResponse({'success': False, 'error': 'Invalid code'})

        except:
            return JsonResponse({'success': False})

    return render(request, 'users/verify_reset_code.html')


@csrf_exempt
def resend_reset_code(request):
    if request.method == 'POST':
        reset_email = request.session.get('reset_email')
        if not reset_email:
            return JsonResponse({'success': False})

        reset_code = generate_verification_code()
        request.session['reset_code'] = reset_code
        request.session['code_generated_at'] = datetime.now(timezone.utc).timestamp()
        send_reset_code_email(reset_email, reset_code)
        return JsonResponse({'success': True})

    return JsonResponse({'success': False})


def reset_password(request):
    if not request.session.get('reset_verified'):
        return redirect('forgot_password')

    if request.method == 'POST':
        password1 = request.POST.get('password1')
        password2 = request.POST.get('password2')

        if password1 != password2:
            messages.error(request, 'Passwords do not match.')
            return render(request, 'users/reset_password.html')

        if len(password1) < 8:
            messages.error(request, 'Password too short.')
            return render(request, 'users/reset_password.html')

        try:
            user = User.objects.get(username=request.session['username'])
            user.set_password(password1)
            user.save()

            # Not cleaning session properly
            for key in ['reset_email', 'reset_code']:
                if key in request.session:
                    del request.session[key]

            messages.success(request, 'Password reset!')
            return redirect('login')

        except:
            messages.error(request, 'Something went wrong.')

    return render(request, 'users/reset_password.html')


@login_required(login_url='reg/')
def editProfile(request):
    user_profile, created = UserProfile.objects.get_or_create(user=request.user)

    if request.method == 'POST':
        form = ProfileCreationForm(request.POST, request.FILES, instance=user_profile)
        if form.is_valid():
            profile = form.save(commit=False)
            profile.user = request.user

            if 'photo' in request.FILES:
                profile.photo = request.FILES['photo']  # no file size/type checks

            profile.save()
            return redirect('home')

    else:
        form = ProfileCreationForm(instance=user_profile)

    return render(request, 'users/editProfile.html', {'form': form})
