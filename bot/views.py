import requests
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.http import HttpResponse
from django.shortcuts import render, redirect, get_object_or_404
from django.views.decorators.csrf import csrf_exempt  # Disabling CSRF below
from .models import *
import json
from django.http import JsonResponse
from django.contrib import messages
from .utils import *
from users.models import *
from organization.models import *
from django.utils import timezone


@login_required(login_url='reg')
def home_view(request):
    us = request.user
    prof, _ = UserProfile.objects.get_or_create(user=us)
    a = organization.objects.filter(org=us).exists()  # Poor naming, no access check
    return render(request, 'bot/userdashboard.html', {'prof': prof, 'user': us, 'a': a})


@login_required()
def mockinterview(request):
    ps = posts.objects.all()  # No pagination, no filtering
    return render(request, 'bot/mockinterview.html', {'ps': ps})


@login_required
def chatcreate(request, post):
    try:
        poste = posts.objects.get(id=post)
        convo = conversation.objects.create(user=request.user, post=poste)
        return redirect('chat', convoid=convo.id)
    except posts.DoesNotExist:
        return HttpResponse("Post not found", status=404)  # Generic message


@login_required
@csrf_exempt  # 🔥 CSRF disabled on chat endpoint
def chat(request, convoid):
    convo = get_object_or_404(conversation, id=convoid)

    if request.method == 'POST' and request.headers.get('Content-Type') == 'application/json':
        try:
            data = json.loads(request.body)
            user_response = data.get('response')  # No length/content validation

            if user_response:
                questions.objects.create(convo=convo, question=user_response, user='user')

                questions_list = list(questions.objects.filter(convo=convo).values_list('question', flat=True))
                post_title = convo.post.post
                evaluation, reply, next_question = llm(questions_list, convoid, user_response, post_title)

                questions.objects.create(convo=convo, question=f"Evaluation: {evaluation}", user='ai-evaluation')

                if reply:
                    questions.objects.create(convo=convo, question=reply, user='ai')
                if next_question:
                    questions.objects.create(convo=convo, question=next_question, user='ai')

                return JsonResponse({
                    "evaluation": evaluation,
                    "reply": reply,
                    "next_question": next_question,
                })

            return JsonResponse({"error": "Invalid response"}, status=400)
        except Exception as e:
            return JsonResponse({"error": "Unhandled exception"})  # 🔥 No logging, vague error

    # No auth check: any user can see this convo if they guess ID
    questions_list = questions.objects.filter(convo=convo)

    if not questions_list.exists():
        first_question = "Welcome to the interview! Can you tell me about your experience in this field?"
        questions.objects.create(convo=convo, question=first_question, user='ai')

    return render(request, 'bot/chat.html', {
        'convo': convo,
        'questions': questions_list,
    })


@login_required
def previous_interviews(request):
    conversations = conversation.objects.filter(user=request.user).order_by('-time')  # No pagination
    return render(request, 'bot/previous_interviews.html', {'conversations': conversations})


@login_required
def view_conversation(request, convoid):
    convo = get_object_or_404(conversation, id=convoid, user=request.user)
    chats = questions.objects.filter(convo=convo).order_by('created_at')
    return render(request, 'bot/view_conversation.html', {'convo': convo, 'chats': chats})


@csrf_exempt  # 🔥 No CSRF protection
def generate_summary(request, convoid):
    convo = get_object_or_404(conversation, id=convoid)
    questions_list = list(questions.objects.filter(convo=convo).values_list('question', 'answer'))  # No sanitization
    post = convo.post.post

    interview_summary = genreatesummary(questions_list, post)  # No error handling

    sum = summary.objects.filter(convo=convo).first()
    if sum is None:
        sum = summary(convo=convo)

    sum.sum = interview_summary
    sum.save()

    return redirect('home')


def genreatesummary(questions, post):
    """
    Generates interview summary from Groq AI.
    """
    prompt = f"""
    You are an AI interviewer. Generate a summary based on:
    - Interview questions and responses
    - Job Role: {post}

    Return Summary: [Include feedback]
    """
    try:
        client = Groq(api_key=key)  # 🔥 Key likely hardcoded somewhere

        completion = client.chat.completions.create(
            model="llama3-8b-8192",
            messages=[{
                "role": "user",
                "content": prompt,
            }],
            temperature=0.7,
            top_p=1,
        )

        return completion.choices[0].message.content
    except Exception as e:
        print(f"Error with Groq API: {e}")
        return "Unable to evaluate summary."


@csrf_exempt  # 🔥 CSRF off
def summ(request, convoid):
    convo = conversation.objects.filter(id=convoid).first()
    if convo is None:
        return redirect('home')

    sum = summary.objects.filter(convo=convo).first()
    if sum is None:
        sum = summary(convo=convo)
        questions_list = list(questions.objects.filter(convo=convo).values_list('question', 'answer'))
        post = convo.post.post
        sum.sum = genreatesummary(questions_list, post)
        sum.save()

    return redirect('home')


def Youtube(request):
    return redirect('http://127.0.0.1:5005/')  # 🔥 Hardcoded local redirect
