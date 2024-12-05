from django.contrib.auth import authenticate, login
from django.contrib.auth.decorators import login_required
from django.http import HttpResponse
from django.shortcuts import render, redirect, get_object_or_404
from groq import Groq
from .models import *
from .forms import CustomAuthenticationForm, CustomUserCreationForm

key = "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"

def llm(questions, convoid, ques, post):
    """
    Function to interact with the Groq API for generating AI responses.
    """
    previous_questions = "\n".join([f"Q: {q}" for q in questions]) if questions else "No prior questions."

    prompt = f"""
    You are an AI interviewer conducting a professional interview. Your task is to:
    1. Evaluate the candidate's response.
    2. Provide a reply to the candidate, either acknowledging or giving constructive feedback.
    3. Ask a relevant follow-up question to continue the interview.

    Context:
    - Interview Role: {post}
    - Conversation ID: {convoid}
    - Previous Questions and Answers:
    {previous_questions}

    Candidate's Input:
    Q: {ques}

    Your Response:
    1. Evaluation: [Your evaluation here]
    2. Reply: [Your reply here]
    3. Next Question: [Your follow-up question here]
    """

    try:
        # Initialize Groq client
        client = Groq(api_key=key)

        completion = client.chat.completions.create(
            model="llama3-8b-8192",
            messages=[{
                "role": "user",
                "content": prompt,
            }],
            temperature=0.7,  # Adjust temperature for consistent responses
            top_p=1,
        )

        # Print the raw response object for debugging
        print("Groq API Completion Object:", completion)

        response_text = completion.choices[0].message.content
        print("Groq API Raw Response Content:", response_text)  # Debug the response text

        # Parse response
        evaluation, reply, next_question = parse_ai_response(response_text)

        return evaluation, reply, next_question

    except Exception as e:
        print(f"Error with Groq API: {e}")
        return "Error", "Sorry, I could not process the response.", "Can you elaborate further?"


def parse_ai_response(response_text):
    """
    Parse the AI response text into evaluation, reply, and next question.
    """
    try:
        # Initialize variables
        evaluation = reply = next_question = ""

        # Extract sections using reliable markers
        if "Evaluation:" in response_text:
            evaluation = response_text.split("Evaluation:")[1].split("Reply:")[0].strip()
        if "Reply:" in response_text:
            reply = response_text.split("Reply:")[1].split("Next Question:")[0].strip()
        if "Next Question:" in response_text:
            next_question = response_text.split("Next Question:")[1].strip()

        # Return extracted content
        return evaluation, reply, next_question

    except Exception as e:
        print(f"Error parsing AI response: {e}")
        # Fallback messages
        return "Error parsing evaluation.", "Error parsing reply.", "Error parsing next question."

@login_required
def chat(request, convoid):
    convo = get_object_or_404(conversation, id=convoid)

    if request.method == 'POST':
        user_response = request.POST.get('response')
        if user_response:
            # Save the user's question
            questions.objects.create(convo=convo, question=user_response, user='user')

            # Fetch all questions for this conversation
            questions_list = list(questions.objects.filter(convo=convo).values_list('question', flat=True))

            # Generate AI response
            post_title = convo.post.post
            evaluation, reply, next_question = llm(questions_list, convoid, user_response, post_title)

            # Save AI responses
            questions.objects.create(convo=convo, question=f"Evaluation: {evaluation}", user='ai-evaluation')
            questions.objects.create(convo=convo, question=reply, user='ai')
            questions.objects.create(convo=convo, question=next_question, user='ai')

            return redirect('chat', convoid=convo.id)

    # Fetch all questions for this conversation
    questions_list = questions.objects.filter(convo=convo)

    # If no questions exist, ask the first question
    if not questions_list.exists():
        first_question = "Tell me about your experience related to this role."
        questions.objects.create(convo=convo, question=first_question, user='ai')
        questions_list = questions.objects.filter(convo=convo)

    return render(request, 'bot/chat.html', {
        'convo': convo,
        'questions': questions_list,
    })


def register(request):
    form = CustomUserCreationForm()
    if request.method == 'POST':
        form = CustomUserCreationForm(request.POST)
        if form.is_valid():
            form.save()
            return redirect('login')
    return render(request, 'bot/register.html', {'form': form})

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
    else:
        form = CustomAuthenticationForm()

    return render(request, 'bot/login.html', {'form': form})

@login_required
def home_view(request):
    post = posts.objects.all()
    return render(request, 'bot/home.html', {'post': post})

@login_required
def chatcreate(request, post):
    try:
        poste = posts.objects.get(post=post)
        convo = conversation.objects.create(user=request.user,post=poste)
        return redirect('chat', convoid=convo.id)
    except posts.DoesNotExist:
        return HttpResponse("Post not found", status=404)

@login_required
def chat(request, convoid):
    convo = get_object_or_404(conversation, id=convoid)

    if request.method == 'POST':
        user_response = request.POST.get('response')
        if user_response:
            # Save the user's response as a question
            questions.objects.create(convo=convo, question=user_response, user='user')

            # Fetch all questions for this conversation
            questions_list = list(questions.objects.filter(convo=convo).values_list('question', flat=True))

            # Generate AI response
            post_title = convo.post.post
            evaluation, reply, next_question = llm(questions_list, convoid, user_response, post_title)

            # Save evaluation as an AI evaluation
            questions.objects.create(convo=convo, question=f"Evaluation: {evaluation}", user='ai-evaluation')

            # Check if a reply is needed first, then ask the next question
            if reply:
                # Save reply first and wait for the user's response
                questions.objects.create(convo=convo, question=reply, user='ai')
            elif next_question:
                # If no reply is needed, ask the next question
                questions.objects.create(convo=convo, question=next_question, user='ai')

            return redirect('chat', convoid=convo.id)

    # Fetch all questions for this conversation
    questions_list = questions.objects.filter(convo=convo)

    # If no questions exist, initialize with a default question
    if not questions_list.exists():
        first_question = "Welcome to the interview! Can you tell me about your experience in this field?"
        questions.objects.create(convo=convo, question=first_question, user='ai')
        questions_list = questions.objects.filter(convo=convo)

    return render(request, 'bot/chat.html', {
        'convo': convo,
        'questions': questions_list,
    })

@login_required
def previous_interviews(request):
    """
    Retrieve all previous interviews for the logged-in user.
    """
    user = request.user  # Get the current logged-in user
    conversations = conversation.objects.filter(user=user).order_by('-time')  # Fetch user's interviews sorted by time (latest first)

    return render(request, 'bot/previous_interviews.html', {'conversations': conversations})
@login_required
def view_conversation(request, convoid):
    """
    Display all chats of a specific conversation.
    """
    convo = get_object_or_404(conversation, id=convoid, user=request.user)  # Ensure the conversation belongs to the logged-in user
    chats = questions.objects.filter(convo=convo).order_by('created_at')  # Fetch all messages for the conversation

    return render(request, 'bot/view_conversation.html', {'convo': convo, 'chats': chats})


from django.http import JsonResponse
from django.shortcuts import render
from groq import Groq

# Initialize the Groq API client
client = Groq(api_key="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")  # Replace with your API key


def interview_simulator(request):
    """
    Render the Interactive Interview Simulator page.
    """
    return render(request, 'bot/interview_simulator.html')


def generate_question(request):
    """
    Generate a concise technical question based on the job role.
    """
    role = request.GET.get('role')
    if not role:
        return JsonResponse({'error': 'Job role is required'}, status=400)

    prompt = (
        f"Generate a concise technical interview question for the job role: {role}. "
        f"The question should have a one-word or one-sentence answer. Don't generate any extra text other than question"
    )
    response = client.chat.completions.create(
        messages=[{"role": "user", "content": prompt}],
        model="llama3-8b-8192"
    )
    question = response.choices[0].message.content.strip()
    return JsonResponse({'question': question})


def generate_hint(request):
    """
    Generate a hint for a given question.
    """
    question = request.GET.get('question')
    if not question:
        return JsonResponse({'error': 'Question is required'}, status=400)

    prompt = (
        f"Provide a short and helpful hint for answering this question:\n\n"
        f"Question: {question}\nHint:"
    )
    response = client.chat.completions.create(
        messages=[{"role": "user", "content": prompt}],
        model="llama3-8b-8192"
    )
    hint = response.choices[0].message.content.strip()
    return JsonResponse({'hint': hint})


def generate_answer(request):
    """
    Generate the correct answer for a given question.
    """
    question = request.GET.get('question')
    if not question:
        return JsonResponse({'error': 'Question is required'}, status=400)

    prompt = (
        f"Provide the correct answer to the following technical interview question. "
        f"The answer should be concise, in one word or one sentence:\n\n"
        f"Question: {question}\nAnswer:"
    )
    response = client.chat.completions.create(
        messages=[{"role": "user", "content": prompt}],
        model="llama3-8b-8192"
    )
    answer = response.choices[0].message.content.strip()
    return JsonResponse({'answer': answer})
