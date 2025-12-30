from django.shortcuts import render
from urllib3 import request
from .serializers import *
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import *
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.authentication import TokenAuthentication
from .permissions import *
from utils.request_models import *
from django.utils import timezone
from django.db.models import Q
from utils.ResumeExtractor import ResumeExtractor
from utils.Evaluator import Evaluator
from utils.FinalEvaluator import FinalEvaluator
from utils.FollowUpdecider import FollowUpDecider
from utils.resumeQuestiongeneratorAgent import ResumeQuestionGenerator
import requests
from PyPDF2 import PdfReader
from django.core.files.base import ContentFile

# Create your views here.
class CustomInterviewView(APIView):
    permission_classes = [IsAuthenticated, IsOrganization]
    authentication_classes = [TokenAuthentication]

    def post(self, request):
        serializer = CustomInterviewSerializer(data=request.data)
        if serializer.is_valid():
            # Get the first organization associated with the user
            org_instance = request.user.organization.first()
            
            serializer.save(org=org_instance)
            return Response({"message": "Interview created successfully."}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    def put(self, request, id):
        try:
            interview = Custominterviews.objects.get(id=id)
        except Custominterviews.DoesNotExist:
            return Response({"error": "Interview not found."}, status=status.HTTP_404_NOT_FOUND)
        if interview.org.org != request.user:
            return Response({"error": "You do not have permission to update this interview."}, status=status.HTTP_403_FORBIDDEN)
        serializer = CustomInterviewSerializer(interview, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({"message": "Interview updated successfully."}, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def get(self, request, id):
        try:
            interview = Custominterviews.objects.get(id=id)
        except Custominterviews.DoesNotExist:
            return Response({"error": "Interview not found."}, status=status.HTTP_404_NOT_FOUND)
        if interview.org.org != request.user:
            return Response({"error": "You do not have permission to view this interview."}, status=status.HTTP_403_FORBIDDEN)
        serializer = CustomInterviewSerializer(interview)
        return Response(serializer.data, status=status.HTTP_200_OK)
class getInterview(APIView):
    permission_classes = [IsAuthenticated, IsOrganization]
    authentication_classes = [TokenAuthentication]

    def get(self, request):
        interviews = Custominterviews.objects.filter(org__org=request.user)
        serializer = CustomInterviewSerializer(interviews, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

class InterviewSessionInitializerView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [TokenAuthentication]

    def post(self, request, id):
        try:
            interview = Custominterviews.objects.get(id=id)
        except Custominterviews.DoesNotExist:
            return Response({"error": "Interview not found."}, status=status.HTTP_404_NOT_FOUND)
        interview = Application.objects.filter(user=request.user, interview=interview).first()
        if not interview:
            return Response({"error": "You have not applied for this interview."}, status=status.HTTP_403_FORBIDDEN)
        if not interview.approved:
            return Response({"error": "Application not approved."}, status=status.HTTP_403_FORBIDDEN)
        if interview.interview.startTime > timezone.now() or interview.interview.endTime < timezone.now():
            return Response({"error": "Interview time has passed."}, status=status.HTTP_400_BAD_REQUEST)
        session = InterviewSession.objects.filter(Application=interview).first()
        if session:
            return Response({"error": "Interview session already exists."}, status=status.HTTP_400_BAD_REQUEST)
        session = InterviewSession.objects.create(Application=interview)
        question = Customquestion.objects.filter(interview=interview.interview).first()
        if question:
            session.current_question_index = 0
            session.status = "ongoing"
            session.save()
            interaction = Interaction.objects.create(session=session, Customquestion=question)
            follow_up = FollowUpQuestions.objects.create(Interaction=interaction, question=question.question)
        return Response({"message": "Interview session initialized successfully.", "session_id": session.id, "question": question.question}, status=status.HTTP_201_CREATED)

class InterviewSessionView(APIView):
    permission_classes = [IsAuthenticated]  
    authentication_classes = [TokenAuthentication]

    def post(self, request, id):
        try:
            session = InterviewSession.objects.get(id=id)
        except InterviewSession.DoesNotExist:
            return Response({"error": "Interview session not found."}, status=status.HTTP_404_NOT_FOUND)
        if request.user != session.Application.user:
            return Response({"error": "You do not have permission to access this session."}, status=status.HTTP_403_FORBIDDEN)
        if session.status != 'ongoing':
            return Response({"error": "Session is not ongoing."}, status=status.HTTP_400_BAD_REQUEST)
        current_index = session.current_question_index
        questions = Customquestion.objects.filter(interview=session.Application.interview)
        current_question = questions[current_index] if current_index < len(questions) else None
        
        if not current_question:
            return Response({"error": "No current question found."}, status=status.HTTP_400_BAD_REQUEST)
        
        interaction = Interaction.objects.filter(session=session, Customquestion=current_question).first()
        
        if not interaction:
            # Create new interaction if it doesn't exist
            interaction = Interaction.objects.create(
                session=session,
                Customquestion=current_question
            )
        follow_up = FollowUpQuestions.objects.filter(Interaction=interaction).last()
        follow_up.answer = request.query_params.get('answer', None)
        follow_up.save()
        
        # Build conversation context from follow-up questions
        follow_up_questions = FollowUpQuestions.objects.filter(Interaction=interaction).order_by('created_at')
        conversation_context = []
        for follow_up in follow_up_questions:
            conversation_context.append(f"Q: {follow_up.question}")
            if follow_up.answer:
                conversation_context.append(f"A: {follow_up.answer}")
        
        count = follow_up_questions.count()
        llm = Evaluator()
        
        if count >= 3:
            # Use the evaluate_answer method from InterviewManager
            req = EvaluationRequest(
                position=session.Application.interview.post,
                experience=session.Application.interview.experience,
                question=current_question.question,
                conversation_context=conversation_context,
                expected_answer=current_question.answer
            )
            
            try:
                response = llm.evaluate(req)
                interaction.score = response.score
                interaction.feedback = response.feedback
                interaction.save()
            except Exception as e:
                return Response({"error": f"Evaluation failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            session.current_question_index += 1
            session.save()
            
            if questions.count() > session.current_question_index:
                next_question = questions[session.current_question_index].question
                next_interaction = Interaction.objects.create(
                    session=session,
                    Customquestion=questions[session.current_question_index]
                )
                follow_up = FollowUpQuestions.objects.create(
                    Interaction=next_interaction, 
                    question=next_question
                )
                return Response({
                    "session_id": session.id, 
                    "current_question": next_question,
                    "completed": False
                }, status=status.HTTP_200_OK)
            else:
                # Interview completed - perform final evaluation
                session.status = 'completed'
                session.save()
                
                # Perform final evaluation
                final_evaluation_response = self.perform_final_evaluation(session)
                
                return Response({
                    "completed": True
                }, status=status.HTTP_200_OK)
        else:
            # Use the follow_up_decider method from InterviewManager
            req = FollowUpRequest(
                position=session.Application.interview.post,
                experience=session.Application.interview.experience,
                expected_answer=current_question.answer,
                conversation_context=conversation_context
            )
            
            try:
                llm = FollowUpDecider()
                follow_up_decision = llm.evaluate(req)
                
                if follow_up_decision.needs_followup and follow_up_decision.followup_question:
                    # Create follow-up question
                    next_question_obj = FollowUpQuestions.objects.create(
                        Interaction=interaction, 
                        question=follow_up_decision.followup_question
                    )
                    return Response({
                        "session_id": session.id, 
                        "current_question": follow_up_decision.followup_question,
                        "completed": False
                    }, status=status.HTTP_200_OK)
                else:
                    eval_req = EvaluationRequest(
                        position=session.Application.interview.post,
                        experience=session.Application.interview.experience,
                        question=current_question.question,
                        conversation_context=conversation_context,
                        expected_answer=current_question.answer
                    )
                    
                    try:
                        llm = Evaluator()
                        evaluation_response = llm.evaluate(eval_req)
                        interaction.score = evaluation_response.score
                        interaction.feedback = evaluation_response.feedback
                        interaction.save()
                    except Exception as e:
                        return Response({"error": f"Evaluation failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                    
                    session.current_question_index += 1
                    session.save()
                    
                    if questions.count() > session.current_question_index:
                        next_question = questions[session.current_question_index].question
                        next_interaction = Interaction.objects.create(
                            session=session,
                            Customquestion=questions[session.current_question_index]
                        )
                        next_question_obj = FollowUpQuestions.objects.create(
                            Interaction=next_interaction, 
                            question=next_question
                        )
                        return Response({
                            "session_id": session.id, 
                            "current_question": next_question,
                            "completed": False


                        }, status=status.HTTP_200_OK)
                    else:
                        # Interview completed - perform final evaluation
                        session.status = 'completed'
                        session.save()
                        
                        final_evaluation_response = self.perform_final_evaluation(session)
                        
                        return Response({
                            "completed": True
                        }, status=status.HTTP_200_OK)
                        
            except Exception as e:
                return Response({"error": f"Follow-up decision failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    def perform_final_evaluation(self, session):
        """
        Performs final evaluation of the completed interview session
        """
        try:
            # Get all interactions for this session
            interactions = Interaction.objects.filter(session=session).order_by('created_at')
            
            if not interactions.exists():
                return {"error": "No interactions found for final evaluation"}
            
            # Build comprehensive interview history
            interview_history = []
            
            for interaction in interactions:
                question_data = {
                    "main_question": interaction.Customquestion.question,
                    "expected_answer": interaction.Customquestion.answer,
                    "individual_score": interaction.score,
                    "individual_feedback": interaction.feedback
                }
                
                interview_history.append(question_data)
            
            llm = FinalEvaluator()
            
            req = FinalEvaluationRequest(
                position=session.Application.interview.post,
                experience=session.Application.interview.experience,
                interview_history=interview_history
            )
            
            final_evaluation = llm.evaluate(req)
            
            # Save final evaluation to session
            session.Devscore = final_evaluation.overall_score
            session.feedback = final_evaluation.overall_feedback
            session.strengths = final_evaluation.strengths
            session.recommendation = final_evaluation.recommendation
            session.save()
            
            return {
                "overall_score": final_evaluation.overall_score,
                "overall_feedback": final_evaluation.overall_feedback,
                "strengths": final_evaluation.strengths,
                "recommendation": final_evaluation.recommendation,
                "individual_scores": [
                    {
                        "question": interaction.Customquestion.question,
                        "score": interaction.score,
                        "feedback": interaction.feedback
                    } for interaction in interactions
                ]
            }
            
        except Exception as e:
            return {"error": f"Final evaluation failed: {str(e)}"}

class GetAllInterviewsView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [TokenAuthentication]

    def get(self, request):
        interviews = Custominterviews.objects.filter(
            Q(submissionDeadline__gt=timezone.now()) |
            Q(applications__user=request.user)
        ).distinct()
        serializer = InterviewSerializer(interviews, many=True, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

class ApplicationView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [TokenAuthentication]

    def post(self, request, id):
        try:
            interview = Custominterviews.objects.get(id=id)
        except Custominterviews.DoesNotExist:
            return Response({"error": "Interview not found."}, status=status.HTTP_404_NOT_FOUND)

        if Application.objects.filter(user=request.user, interview=interview).exists():
            return Response({"error": "You have already applied for this interview."}, status=status.HTTP_400_BAD_REQUEST)

        if interview.submissionDeadline < timezone.now():
            return Response({"error": "Submission deadline has passed."}, status=status.HTTP_400_BAD_REQUEST)

        # Expect 'resume_url' in request data
        resume_url = request.data.get("resume_url")
        if not resume_url:
            return Response({"error": "Missing resume URL."}, status=status.HTTP_400_BAD_REQUEST)

        # Download the resume
        try:
            response = requests.get(resume_url)
            response.raise_for_status()
        except requests.RequestException as e:
            return Response({"error": f"Failed to download resume: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

        # Read PDF content
        try:
            pdf_reader = PdfReader(ContentFile(response.content))
            extracted_text = ""
            for page in pdf_reader.pages:
                extracted_text += page.extract_text() or ""
                print(extracted_text)
        except Exception as e:
            return Response({"error": f"Failed to process PDF: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

        # Validate and save the application
        serializer = ApplicationSerializer(data=request.data)
        if serializer.is_valid():
            application = serializer.save(
                user=request.user,
                interview=interview,
                
            )
            req = resumeExtractionRequest(
                resume_text=extracted_text,
                job_title=interview.post,
                job_description=interview.desc,
                experience=interview.experience
            )
            llm = ResumeExtractor()
            try:
                response = llm.evaluate(req)
                print("Resume extraction response:", response)
                application.rawResume=extracted_text
                application.resume = resume_url
                application.extratedResume = response.extracted_standardized_resume
                application.score = response.score
                application.feedback = response.feedback
                try:
                    application.shortlisting_decision = response.shortlisting_decision
                except Exception as e:
                    application.shortlisting_decision = False
                application.save()
            except Exception as e:
                return Response({"error": f"Failed to extract resume information: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)
            
            return Response({
                "message": "Application created successfully.",
                "application_id": application.id,
                "extracted_resume_text": extracted_text[:500]  # Optionally show a preview
            }, status=status.HTTP_201_CREATED)

        return Response({"error": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
    
    def get(self, request, id):
        try:
            interview = Custominterviews.objects.get(id=id)
        except Custominterviews.DoesNotExist:
            return Response({"error" : "Interview not found"}, status=status.HTTP_404_NOT_FOUND)
        org = interview.org
        if request.user != org.org:
            return Response({"error" : "You are not authorized to view this interview"}, status=status.HTTP_403_FORBIDDEN)
        applications = Application.objects.filter(interview=interview)
        serializer = ApplicationSerializer(applications,many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    def put(self, request, id):
        try:
            application = Application.objects.get(id=id)
        except Application.DoesNotExist:
            return Response({"error" : "Application not found"}, status=status.HTTP_404_NOT_FOUND)
        if request.user != application.interview.org.org:
            return Response({"error" : "You are not authorized to update this application"}, status=status.HTTP_403_FORBIDDEN)
        application.approved = not application.approved
        application.save()
        return Response({"message" : "Application status updated"}, status=status.HTTP_200_OK)
    
class LeaderBoardView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [TokenAuthentication]

    def get(self, request, id):
        try:
            interview = Custominterviews.objects.get(id=id)
        except Custominterviews.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        if request.user != interview.org.org:
            return Response({"error": "You are not authorized to view this leaderboard"}, status=status.HTTP_403_FORBIDDEN)

        application = Application.objects.filter(interview=interview)
        session = InterviewSession.objects.filter(Application__in=application)
        try:
            serializer = LeaderBoardSerializer(session, many=True)          
                    
            return Response(serializer.data, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({serializer.data, 
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class CheatingDetection(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [TokenAuthentication]

    def put(self, request, id):
        try:
            session = InterviewSession.objects.get(id=id)
            if request.user != session.Application.user:
                return Response({"error": "You are not authorized to access this session"}, status=status.HTTP_403_FORBIDDEN)
            session.status = 'cheated'
            session.save()
            return Response({"message": "Session marked as cheated"}, status=status.HTTP_200_OK)
        except InterviewSession.DoesNotExist:
            return Response({"error": "Session not found"}, status=status.HTTP_404_NOT_FOUND)

class SessionDsaQuestions(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [TokenAuthentication]

    def get(self, request, id):
        try:
            try:
                session = InterviewSession.objects.get(id=id)
            except InterviewSession.DoesNotExist:
                return Response({"error": "session not found"}, status=status.HTTP_404_NOT_FOUND)

            interview = Custominterviews.objects.get(id=session.Application.interview.id)

            dsa_questions = DsaTopics.objects.filter(interview=interview)
            dsa_topics = DsaTopics.objects.filter(interview=interview)
            print(dsa_topics)
            created_interactions = []
            for topic in dsa_topics:
                # ✅ Create a DSAInteraction for each topic
                interaction, created = DSAInteractions.objects.get_or_create(
                    session=session,
                    topic=topic,
                    defaults={
                        "created_at": timezone.now()
                    }
                )
                created_interactions.append(interaction)
            print(created_interactions)
            serializer = DSAQuestionsSerializer(dsa_questions, many=True)
            
            return Response(serializer.data, status=status.HTTP_200_OK)

        except Custominterviews.DoesNotExist:
            return Response({"error": "Interview not found"}, status=status.HTTP_404_NOT_FOUND)
    def post(self, request, id,dsa_id):
        try:
            session = InterviewSession.objects.get(id=id)
        except InterviewSession.DoesNotExist:
            return Response({"error": "Session not found"}, status=status.HTTP_404_NOT_FOUND)
        try:
            dsa_topic = DsaTopics.objects.get(id=dsa_id)
        except DsaTopics.DoesNotExist:
            return Response({"error": "DSA Topic not found"}, status=status.HTTP_404_NOT_FOUND)
        try:
            dsa_interaction = DSAInteractions.objects.get(session=session, topic=dsa_topic)
            dsa_interaction.score= request.data.get("score")
            dsa_interaction.question=request.data.get("question", "")
            dsa_interaction.code=request.data.get("code")
            dsa_interaction.save()
            dsa = DSAInteractions.objects.filter(session=session,score__isnull=False)
            score = 0
            for d in dsa:
                score= score + d.score
            score = score/len(dsa)
            session.DsaScore=score
            session.save()
        except DSAInteractions.DoesNotExist:
            
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        
        return Response({"message": "DSA interaction created", "id": dsa_interaction.id}, status=status.HTTP_201_CREATED)


class resumeQuestion(APIView):
    def post(self, request, id):
        try:
            session = InterviewSession.objects.get(id=id)
        except InterviewSession.DoesNotExist:
            return Response({"error": "Session not found"}, status=status.HTTP_404_NOT_FOUND)
        if not session.Application.interview.ask_questions_on_resume:
            return Response({
                "completed" : True
            }, status=status.HTTP_200_OK)
        # Check if a resumeconvo already exists for this session
        existing_convo = resumeconvo.objects.filter(session=session).first()
        if existing_convo:
            # ✅ Get first unanswered convo for this session
            unanswered_convo = resumeconvo.objects.filter(session=session, answer__isnull=True).first()
            if not unanswered_convo:
                return Response({"compeletd": True}, status=status.HTTP_200_OK)
            ans = request.data.get("answer")
            # Build EvaluationRequest
            application = session.Application
            eval_request = EvaluationRequest(
                position=application.interview.post,
                experience=application.interview.experience,
                question=unanswered_convo.question,
                conversation_context=[
                    f"Q: {unanswered_convo.question}, A: {ans or ''}" 
                    
                ],
                expected_answer=unanswered_convo.expected_answer
            )

            # Call evaluator
            evaluator = Evaluator()
            eval_result = evaluator.evaluate(eval_request)
            print(eval_result)
            unanswered_convo.score=eval_result.score
            unanswered_convo.answer=ans
            unanswered_convo.feedback=eval_result.feedback
            unanswered_convo.save()
            unanswered_convo2 = resumeconvo.objects.filter(session=session, answer__isnull=True).first()
            if unanswered_convo2:
                return Response({
                    "completed" : False,
                    "question": unanswered_convo2.question,
                })
            convos = resumeconvo.objects.filter(session=session)
            score = 0
            for c in convos:
                score+=c.score
            score=score/2
            session.Resumescore=score
            session.save()
            return Response({
                "completed" : True
            }, status=status.HTTP_200_OK)

        # ✅ No convo yet → generate new questions
        application = session.Application
        req = questionGenerationRequest(
            extracted_standardized_resume=application.extratedResume,
            job_title=application.interview.post,
            job_description=application.interview.desc,
            experience=application.interview.experience,
        )

        extractor = ResumeQuestionGenerator()
        result = extractor.evaluate(req)

        # result is ResumeQuestionResponse → access extractedQAndA
        convo1 = resumeconvo.objects.create(session=session, question=result[0], expected_answer=result[1])
        convo2 = resumeconvo.objects.create(session=session, question=result[2], expected_answer=result[3])

        return Response({
            "completed" : False,
            "question": convo1.question
        }, status=status.HTTP_201_CREATED)

class InterviewImagesView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [TokenAuthentication]

    def post(self, request, id):
        try:
            session = InterviewSession.objects.get(id=id)
        except InterviewSession.DoesNotExist:
            return Response({"error": "Session not found"}, status=status.HTTP_404_NOT_FOUND)
        if request.user != session.Application.user:
            return Response({"error": "You do not have permission to access this session."}, status=status.HTTP_403_FORBIDDEN)
        
        image_url = request.data.get("image_url")
        if not image_url:
            return Response({"error": "Missing image URL."}, status=status.HTTP_400_BAD_REQUEST)
        
        interview_image = InterviewImages.objects.create(
            sesssion=session,
            image_url=image_url
        )
        
        return Response({
            "message": "Image uploaded successfully.",
            "image_id": interview_image.id,
            "image_url": interview_image.image_url
        }, status=status.HTTP_201_CREATED)


class CandidateDecisionView(APIView):
    """API for organizations to select or reject candidates with feedback"""
    permission_classes = [IsAuthenticated]
    authentication_classes = [TokenAuthentication]

    def generate_ai_feedback(self, session, org_feedback):
        """Generate AI feedback using Groq based on interview performance"""
        import requests
        import os
        import json
        
        groq_api_key = os.environ.get('GROQ_API_KEY')
        if not groq_api_key:
            return None
            
        # Gather interview performance data
        interview_data = {
            'dev_score': session.Devscore or 0,
            'resume_score': session.Resumescore or 0,
            'dsa_score': session.DsaScore or 0,
            'overall_score': session.overallScore or 0,
            'confidence_score': session.confidenceScore or 0,
            'job_title': session.Application.interview.post,
            'company': session.Application.interview.org.orgname,
            'org_feedback': org_feedback or 'No specific feedback provided'
        }
        
        prompt = f"""You are a career coach providing constructive feedback to a job candidate who was not selected.

Interview Performance Data:
- Position: {interview_data['job_title']} at {interview_data['company']}
- Development Skills Score: {interview_data['dev_score']}/10
- Resume Match Score: {interview_data['resume_score']}/10
- DSA/Problem Solving Score: {interview_data['dsa_score']}/10
- Overall Score: {interview_data['overall_score']}/10
- Confidence Score: {interview_data['confidence_score']}/10
- Interviewer's Feedback: {interview_data['org_feedback']}

Generate a constructive, encouraging feedback response in JSON format with these fields:
{{
    "summary": "2-3 sentence summary of the interview outcome focusing on growth opportunities",
    "strengths": ["list of 2-3 things the candidate did well based on their scores"],
    "improvement_areas": ["list of 2-3 specific areas to improve based on low scores"],
    "action_items": ["list of 3-4 concrete actionable steps to improve skills"],
    "encouragement": "1-2 sentences of encouragement for future applications"
}}

Be constructive and helpful, not harsh. Focus on growth mindset."""

        try:
            response = requests.post(
                'https://api.groq.com/openai/v1/chat/completions',
                headers={
                    'Authorization': f'Bearer {groq_api_key}',
                    'Content-Type': 'application/json'
                },
                json={
                    'model': 'llama-3.1-8b-instant',
                    'messages': [{'role': 'user', 'content': prompt}],
                    'temperature': 0.7
                },
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                content = result['choices'][0]['message']['content']
                
                # Parse JSON from response
                try:
                    # Clean up response to extract JSON
                    content = content.strip()
                    if content.startswith('```json'):
                        content = content[7:]
                    if content.startswith('```'):
                        content = content[3:]
                    if content.endswith('```'):
                        content = content[:-3]
                    content = content.strip()
                    
                    feedback_json = json.loads(content)
                    return feedback_json
                except json.JSONDecodeError:
                    return {
                        'summary': content[:500],
                        'strengths': ['Completed the interview process'],
                        'improvement_areas': ['Continue developing technical skills'],
                        'action_items': ['Practice coding problems', 'Review interview feedback', 'Apply to more positions'],
                        'encouragement': 'Keep learning and improving!'
                    }
            else:
                print(f"Groq API error: {response.status_code}")
                return None
        except Exception as e:
            print(f"Error generating AI feedback: {e}")
            return None

    def post(self, request, session_id):
        """
        Select or reject a candidate
        Request body:
        - decision: 'select' or 'reject'
        - feedback: string (optional, but recommended for rejections)
        """
        try:
            session = InterviewSession.objects.get(id=session_id)
        except InterviewSession.DoesNotExist:
            return Response({"error": "Session not found"}, status=status.HTTP_404_NOT_FOUND)
        
        # Check if user is the organization that created the interview
        if request.user != session.Application.interview.org.org:
            return Response({"error": "Not authorized"}, status=status.HTTP_403_FORBIDDEN)
        
        decision = request.data.get('decision')  # 'select' or 'reject'
        feedback_text = request.data.get('feedback', '')
        
        if decision not in ['select', 'reject']:
            return Response({"error": "Decision must be 'select' or 'reject'"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Update the application final decision (organization's manual decision)
        application = session.Application
        application.final_decision = 'accepted' if decision == 'select' else 'rejected'
        application.final_feedback = feedback_text
        application.save()
        
        ai_feedback = None
        
        # If rejected, generate AI feedback and create records for Career Dashboard
        if decision == 'reject':
            try:
                from feedback.models import RejectionFeedback, FeedbackInsight
                
                # Generate AI feedback using Groq
                ai_feedback = self.generate_ai_feedback(session, feedback_text)
                
                # Create rejection feedback with correct field names
                RejectionFeedback.objects.create(
                    user=application.user,
                    interview_session=session,
                    feedback_type='interview_rejection',
                    raw_feedback=feedback_text or 'No specific feedback provided',
                    ai_analyzed_feedback=ai_feedback or {'summary': feedback_text or 'Review your interview performance.'},
                    severity='medium',
                    is_processed=True if ai_feedback else False
                )
                
                # Create actionable insight for the user
                action_items = ai_feedback.get('action_items', [
                    'Review the interview feedback',
                    'Identify areas for improvement',
                    'Practice related skills'
                ]) if ai_feedback else ['Review feedback', 'Practice skills', 'Apply to more positions']
                
                summary = ai_feedback.get('summary', feedback_text or 'Review your interview performance for improvement areas.') if ai_feedback else feedback_text or 'Review your interview performance.'
                
                FeedbackInsight.objects.create(
                    user=application.user,
                    insight_type='interview',
                    title=f'Feedback from {session.Application.interview.org.orgname}',
                    pattern_description=summary,
                    recommended_actions=action_items,
                    priority='high' if session.Devscore and session.Devscore < 5 else 'medium'
                )
                
            except Exception as e:
                print(f"Error creating feedback: {e}")
                # Continue even if feedback creation fails
        
        return Response({
            "message": f"Candidate {decision}ed successfully",
            "candidate": application.user.username,
            "decision": decision,
            "final_decision": application.final_decision,
            "feedback_saved": bool(feedback_text) if decision == 'reject' else False,
            "ai_feedback_generated": bool(ai_feedback)
        }, status=status.HTTP_200_OK)