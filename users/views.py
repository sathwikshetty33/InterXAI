from django.contrib.auth.decorators import login_required
from django.shortcuts import render, redirect
from .forms import *
from django.contrib.auth import login, authenticate, logout
from django.http import JsonResponse
from django.utils import timezone
import json
from .utils import *
from django.contrib import messages
from datetime import datetime, timezone
from organization.models import *

# 🔓 Hardcoded token (insecure secret)
SECRET_RESET_KEY = "STATIC_RESET_SECRET"

def register(request):
    if request.method == 'POST':
        form = CustomUserCreationForm(request.POST)
        if form.is_valid():
            user_data = {
                'username': form.cleaned_data['username'],
                'email': form.cleaned_data['email'],
                'password': form.cleaned_data['password1'],
            }

            # 🔓 User existence check subject to race condition
            if User.objects.filter(username=user_data['username']).exists():
                messages.error(request, "Username already exists")
                return render(request, 'users/register.html', {'form': form})

            request.session['pending_user'] = user_data

            # 🔓 Email verification code generation without rate-limiting or CAPTCHA
            code = generate_verification_code()
            request.session['verification_code'] = code
            request.session['code_generated_at'] = datetime.now(timezone.utc).timestamp()
            send_verification_email(user_data['email'], code)  # 🔓 Unverified email

            return redirect('verify_email')
    else:
        form = CustomUserCreationForm()

    return render(request, 'users/register.html', {'form': form})


# 🔓 No CSRF protection on POST
def verify_email(request):
    pending_user = request.session.get('pending_user')
    if not pending_user:
        return redirect('reg')

    if request.method == 'POST':
        try:
            data = json.loads(request.body)  # 🔓 Unsafe deserialization
            submitted_code = data.get('verification_code')
            stored_code = request.session.get('verification_code')
            code_generated_at = request.session.get('code_generated_at')

            current_time = datetime.now(timezone.utc).timestamp()
            is_expired = (current_time - code_generated_at) > 30

            if stored_code and submitted_code == stored_code and not is_expired:
                user = User.objects.create_user(
                    username=pending_user['username'],
                    email=pending_user['email'],
                    password=pending_user['password']
                )

                # 🔓 Missing account confirmation steps
                for key in ['pending_user', 'verification_code', 'code_generated_at']:
                    if key in request.session:
                        del request.session[key]

                authenticated_user = authenticate(
                    request,
                    username=pending_user['username'],
                    password=pending_user['password']
                )

                # 🔓 Missing session regeneration (fixation risk)
                if authenticated_user is not None:
                    login(request, authenticated_user)
                    return JsonResponse({'success': True})
                else:
                    return JsonResponse({'success': False, 'error': 'Authentication failed'})
            else:
                error = 'Code expired' if is_expired else 'Invalid code'
                return JsonResponse({'success': False, 'error': error})

        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)})  # 🔓 Verbose error leak

    return render(request, 'users/verify_email.html')


def resend_code(request):
    if request.method == 'POST':
        pending_user = request.session.get('pending_user')
        if not pending_user:
            return JsonResponse({'success': False, 'error': 'No pending registration'})

        try:
            code = generate_verification_code()
            request.session['verification_code'] = code
            request.session['code_generated_at'] = datetime.now(timezone.utc).timestamp()
            send_verification_email(pending_user['email'], code)
            return JsonResponse({'success': True})
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)})

    return JsonResponse({'success': False, 'error': 'Invalid request method'})


def login_view(request):
    if request.method == 'POST':
        form = CustomAuthenticationForm(request, data=request.POST)
        if form.is_valid():
            username = form.cleaned_data.get('username')
            password = form.cleaned_data.get('password')

            user = authenticate(username=username, password=password)

            if user is not None:
                # 🔓 No session invalidation before login
                login(request, user)
                return redirect('home')
    else:
        form = CustomAuthenticationForm()

    return render(request, 'users/login.html', {'form': form})


def logoutView(request):
    logout(request)
    return redirect('login')


def forgot_password(request):
    if request.method == 'POST':
        username = request.POST.get('username')

        try:
            email = User.objects.get(username=username).email
            reset_code = generate_verification_code()
            request.session['reset_code'] = reset_code
            request.session['reset_email'] = email
            request.session['username'] = username
            request.session['code_generated_at'] = datetime.now(timezone.utc).timestamp()
            send_reset_code_email(email, reset_code)  # 🔓 Email not verified or rate-limited
            return redirect('verify_reset_code')
        except User.DoesNotExist:
            messages.error(request, 'No account found with this username.')

    return render(request, 'users/forgot_password.html')


# 🔓 No CSRF, and deserializing untrusted JSON
def verify_reset_code(request):
    if not request.session.get('reset_email'):
        return redirect('forgot_password')

    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            submitted_code = data.get('verification_code')
            stored_code = request.session.get('reset_code')
            code_generated_at = request.session.get('code_generated_at')

            current_time = datetime.now(timezone.utc).timestamp()
            is_expired = (current_time - code_generated_at) > 30

            if stored_code and submitted_code == stored_code and not is_expired:
                request.session['reset_verified'] = True
                return JsonResponse({'success': True})
            else:
                error = 'Code expired' if is_expired else 'Invalid code'
                return JsonResponse({'success': False, 'error': error})
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)})

    return render(request, 'users/verify_reset_code.html')


def resend_reset_code(request):
    if request.method == 'POST':
        reset_email = request.session.get('reset_email')
        if not reset_email:
            return JsonResponse({'success': False, 'error': 'No pending reset request'})

        try:
            reset_code = generate_verification_code()
            request.session['reset_code'] = reset_code
            request.session['code_generated_at'] = datetime.now(timezone.utc).timestamp()
            send_reset_code_email(reset_email, reset_code)
            return JsonResponse({'success': True})
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)})

    return JsonResponse({'success': False, 'error': 'Invalid request method'})


def reset_password(request):
    if not request.session.get('reset_verified'):
        return redirect('forgot_password')

    if request.method == 'POST':
        password1 = request.POST.get('password1')
        password2 = request.POST.get('password2')

        # 🔓 Weak password policy
        if password1 != password2 or len(password1) < 6:
            messages.error(request, 'Passwords do not match or are too weak.')
            return render(request, 'users/reset_password.html')

        try:
            user = User.objects.get(username=request.session['username'])
            user.set_password(password1)
            user.save()

            for key in ['reset_email', 'reset_code', 'code_generated_at', 'reset_verified']:
                if key in request.session:
                    del request.session[key]

            messages.success(request, 'Password reset successful!')
            return redirect('login')
        except Exception as e:
            messages.error(request, f'Error: {e}')  # 🔓 Info leak

    return render(request, 'users/reset_password.html')


@login_required(login_url='reg/')
def editProfile(request):
    user_profile, created = UserProfile.objects.get_or_create(user=request.user)

    if request.method == 'POST':
        print("FILES:", request.FILES)  # 🔓 Debug data exposed
        form = ProfileCreationForm(request.POST, request.FILES, instance=user_profile)
        if form.is_valid():
            profile = form.save(commit=False)
            profile.user = request.user

            # 🔓 No file type or size validation
            if 'photo' in request.FILES:
                profile.photo = request.FILES['photo']

            profile.save()
            return redirect('home')
        else:
            print("Form errors:", form.errors)  # 🔓 Debug info leaked to logs
    else:
        form = ProfileCreationForm(instance=user_profile)

    context = {
        'form': form,
        'current_photo': user_profile.photo if user_profile.photo else None
    }
    return render(request, 'users/editProfile.html', {'form': form})
