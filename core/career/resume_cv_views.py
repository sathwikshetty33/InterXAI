import json
import os
import requests
import logging
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import UserSkillProfile

# Configure Logger
logger = logging.getLogger(__name__)

# Templates (Simplified for Prompt Context)
MATEX_TEMPLATE_HINT = """
\\documentclass[a4paper,11pt]{article}
... (Standard Matex Template Structure) ...
\\begin{document}
\\section{Education} ...
\\section{Technical Skills} ...
\\section{Experience} ...
\\section{Projects} ...
\\end{document}
"""

NIT_TEMPLATE_HINT = """
\\documentclass[a4paper,11pt]{article}
... (Standard NIT Raipur Template Structure) ...
\\begin{document}
\\section{\\textbf{Education}} ...
\\section{\\textbf{Experience}} ...
\\section{\\textbf{Technical Skills}} ...
\\end{document}
"""

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_resume_cv(request):
    """
    Generates tailored resumes in Latex format using Groq/LLM.
    """
    try:
        # 1. Fetch User Profile safely
        try:
            user_profile = request.user.skill_profile
        except UserSkillProfile.DoesNotExist:
            # Auto-create if missing, or return error
            # For now, let's try to create a default one or return error
            user_profile = UserSkillProfile.objects.create(user=request.user)
            # Alternatively: return Response({"error": "Profile not found. Please complete your profile first."}, status=400)

        data = request.data
        job_description = data.get('job_description', '')
        
        if not job_description:
             return Response({"error": "Job description is required."}, status=400)

        # 2. Construct User Context
        # skills is a list of dicts: [{"skill": "Python", ...}] or strings
        skills_list = []
        for s in user_profile.skills:
            if isinstance(s, dict):
                skills_list.append(s.get('skill', s.get('name', '')))
            else:
                skills_list.append(str(s))
        
        skills_str = ", ".join(skills_list)
        experience_years = user_profile.experience_years
        
        # 3. PROMPT ENGINEERING
        system_prompt = "You are an expert Resume Writer and LateX Developer."
        
        user_prompt = f"""
        I need you to generate TWO full LaTeX resume codes based on a user's profile and a specific target Job Description.
        
        USER PROFILE:
        Name: {request.user.get_full_name() or request.user.username}
        Email: {request.user.email}
        Skills: {skills_str}
        Experience: {experience_years} years
        
        TARGET JOB DESCRIPTION:
        {job_description}
        
        INSTRUCTIONS:
        1. Analyze the JD and the Profile. Tailor the content (bullet points, summary) to match the JD keywords.
        2. Generate TWO separate LaTeX codes:
           - Format A: "Matex" (Classic, clean, section headers).
           - Format B: "NIT Raipur" (Academic, box headers for section titles).
        3. Also provide a "Match Score" (0-100) and 3 "Improvement Tips".
        
        OUTPUT FORMAT:
        Return ONLY valid JSON with this exact structure (no markdown formatting):
        {{
            "matex_latex": "... full latex code ...",
            "nit_latex": "... full latex code ...",
            "score": 85,
            "tips": ["Tip 1", "Tip 2", "Tip 3"]
        }}
        """

        # 4. Call Groq API
        api_key = os.getenv('GROQ_API_KEY')
        if not api_key:
            logger.error("GROQ_API_KEY is missing in environment variables.")
            return Response({"error": "Server configuration error: Missing API Key"}, status=500)

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": "openai/gpt-oss-120", 
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "temperature": 0.5
        }
        
        # Using Groq API endpoint
        response = requests.post("https://api.groq.com/openai/v1/chat/completions", headers=headers, json=payload)
        
        if response.status_code == 200:
            try:
                ai_content = response.json()['choices'][0]['message']['content']
                # Clean up potential markdown code blocks
                clean_content = ai_content.replace('```json', '').replace('```', '').strip()
                
                parsed_data = json.loads(clean_content)
                return Response(parsed_data)
            except (KeyError, IndexError, json.JSONDecodeError) as e:
                logger.error(f"AI Response Parsing Error: {str(e)} | Content: {response.text}")
                return Response({
                    "error": "AI generation failed to format correctly. Please try again.",
                    "details": str(e)
                }, status=502)
        else:
            logger.error(f"AI Service Error: {response.status_code} - {response.text}")
            
            # --- FALLBACK MECHANISM ---
            # If the API key is wrong (400/401) or service is down (5xx), return specific Mock Data
            # so the user can verify the UI and "Download .tex" functionality.
            
            mock_matex = r"""
\documentclass[a4paper,10pt]{article}
\usepackage{geometry}
\geometry{left=1in,right=1in,top=1in,bottom=1in}
\usepackage{enumitem}
\usepackage{hyperref}

\begin{document}
\pagestyle{empty}

\centerline{\Huge \textbf{""" + (request.user.get_full_name() or request.user.username) + r"""}}
\centerline{""" + request.user.email + r""" | Experience: """ + str(experience_years) + r""" Years}

\section*{Professional Summary}
Driven professional with expertise in """ + skills_str + r""". (Note: This is a fallback resume because the AI service could not be reached. Please check your API Key.)

\section*{Technical Skills}
\begin{itemize}[leftmargin=*]
    \item \textbf{Languages/Tools:} """ + skills_str + r"""
\end{itemize}

\section*{Experience}
\textbf{Software Engineer} \hfill Jan 2022 -- Present \\
\textit{Tech Company Inc.}
\begin{itemize}[leftmargin=*]
    \item Developed scalable applications using Python and React.
    \item \textbf{Key Achievement:} Optimized backend performance by 30\%.
\end{itemize}

\end{document}
"""

            mock_nit = r"""
\documentclass[a4paper,11pt]{article}
\usepackage{titlesec}
\usepackage{geometry}
\geometry{left=0.75in,right=0.75in,top=0.75in,bottom=0.75in}

\begin{document}

\hrule
\vspace{5pt}
\begin{center}
    {\LARGE \textbf{""" + (request.user.get_full_name() or request.user.username) + r"""}} \\
    """ + request.user.email + r"""
\end{center}
\vspace{5pt}
\hrule

\section*{Objective}
To leverage my skills in """ + skills_str + r""" for a challenging role.

\section*{Education}
\textbf{Bachelor of Technology} \hfill 2020 -- 2024 \\
\textit{NIT Raipur}

\section*{Technical Skills}
\noindent \textbf{Core:} """ + skills_str + r"""

\end{document}
"""
            
            # Return Mock Data with a warning
            return Response({
                "matex_latex": mock_matex,
                "nit_latex": mock_nit,
                "score": 75,
                "tips": [
                    "⚠️ API Key Invalid/Missing - Using Fallback Mode",
                    "Add more metrics to your experience",
                    "Highlight recent projects"
                ]
            })

    except Exception as e:
        logger.exception("Unexpected error in generate_resume_cv")
        return Response({"error": f"Internal Server Error: {str(e)}"}, status=500)