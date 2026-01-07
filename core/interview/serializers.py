from rest_framework import serializers
from .models import *


class CustomQuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customquestion
        fields = ["id","question", "answer"]
        extra_kwargs = {
            'id': {'read_only': True}  # Read-only for POST, but available for PUT
        }

class DsaTopicSerializer(serializers.ModelSerializer):
    class Meta:
        model = DsaTopics
        fields = ["id","topic", "difficulty", "number_of_questions"]
        extra_kwargs = {
            'id': {'read_only': True}  # Read-only for POST, but available for PUT
        }

class CodingQuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = CodingQuestion
        fields = ["id", "question"]
        extra_kwargs = {
            'id': {'read_only': True}
        }


class CustomInterviewSerializer(serializers.ModelSerializer):
    questions = CustomQuestionSerializer(many=True)
    dsa_topics = DsaTopicSerializer(many=True)
    coding_questions = CodingQuestionSerializer(many=True)


    class Meta:
        model = Custominterviews
        fields = [
            "id","desc", "post", "experience", "submissionDeadline",
            "startTime", "endTime", "duration", "DSA", "Dev",
            "ask_questions_on_resume", "has_coding_round", "questions", "dsa_topics", "coding_questions",
        ]


    def create(self, validated_data):
        questions_data = validated_data.pop("questions", [])
        dsa_topics_data = validated_data.pop("dsa_topics", [])
        coding_questions_data = validated_data.pop("coding_questions", [])


        interview = Custominterviews.objects.create(**validated_data)

        for q in questions_data:
            q.pop('id', None)  # Remove ID if present in POST
            Customquestion.objects.create(interview=interview, **q)

        for d in dsa_topics_data:
            d.pop('id', None)  # Remove ID if present in POST
            DsaTopics.objects.create(interview=interview, **d)

        for c in coding_questions_data:
            c.pop('id', None)
            CodingQuestion.objects.create(interview=interview, **c)

        return interview


    def update(self, instance, validated_data):
        # Extract nested data
        questions_data = validated_data.pop("questions", [])
        dsa_topics_data = validated_data.pop("dsa_topics", [])
        coding_questions_data = validated_data.pop("coding_questions", [])


        # Update the parent instance
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Update questions (handles both existing and new)
        self._update_questions(instance, questions_data)
        
        # Update DSA topics (handles both existing and new)
        self._update_dsa_topics(instance, dsa_topics_data)

        # Update coding questions
        self._update_coding_questions(instance, coding_questions_data)

        return instance


        return instance

    def _update_questions(self, instance, questions_data):
        # Get existing questions mapped by ID
        existing_questions = {q.id: q for q in instance.questions.all()}
        
        # Track which question IDs are present in the update
        updated_question_ids = set()
        
        for q_data in questions_data:
            question_id = q_data.get('id')
            
            if question_id and question_id in existing_questions:
                # Update existing question
                question = existing_questions[question_id]
                question.question = q_data.get('question', question.question)
                question.answer = q_data.get('answer', question.answer)
                question.save()
                updated_question_ids.add(question_id)
            else:
                # Create new question (either no ID provided or ID doesn't exist)
                q_data_copy = q_data.copy()
                q_data_copy.pop('id', None)  # Remove ID if present
                new_question = Customquestion.objects.create(interview=instance, **q_data_copy)
                updated_question_ids.add(new_question.id)
        
        # Delete questions that weren't included in the update
        questions_to_delete = set(existing_questions.keys()) - updated_question_ids
        if questions_to_delete:
            instance.questions.filter(id__in=questions_to_delete).delete()

    def _update_dsa_topics(self, instance, dsa_topics_data):
        # Get existing DSA topics mapped by ID
        existing_topics = {t.id: t for t in instance.dsa_topics.all()}
        
        # Track which topic IDs are present in the update
        updated_topic_ids = set()
        
        for d_data in dsa_topics_data:
            topic_id = d_data.get('id')
            
            if topic_id and topic_id in existing_topics:
                # Update existing topic
                topic = existing_topics[topic_id]
                topic.topic = d_data.get('topic', topic.topic)
                topic.difficulty = d_data.get('difficulty', topic.difficulty)
                topic.number_of_questions = d_data.get('number_of_questions', topic.number_of_questions)
                topic.save()
                updated_topic_ids.add(topic_id)
            else:
                # Create new topic (either no ID provided or ID doesn't exist)
                d_data_copy = d_data.copy()
                d_data_copy.pop('id', None)  # Remove ID if present
                new_topic = DsaTopics.objects.create(interview=instance, **d_data_copy)
                updated_topic_ids.add(new_topic.id)
        
        # Delete topics that weren't included in the update
        topics_to_delete = set(existing_topics.keys()) - updated_topic_ids
        if topics_to_delete:
            instance.dsa_topics.filter(id__in=topics_to_delete).delete()

    def _update_coding_questions(self, instance, coding_questions_data):
        existing_questions = {q.id: q for q in instance.coding_questions.all()}
        updated_question_ids = set()

        for q_data in coding_questions_data:
            question_id = q_data.get('id')
            if question_id and question_id in existing_questions:
                question = existing_questions[question_id]
                question.question = q_data.get('question', question.question)
                question.save()
                updated_question_ids.add(question_id)
            else:
                q_data_copy = q_data.copy()
                q_data_copy.pop('id', None)
                new_question = CodingQuestion.objects.create(interview=instance, **q_data_copy)
                updated_question_ids.add(new_question.id)
        
        questions_to_delete = set(existing_questions.keys()) - updated_question_ids
        if questions_to_delete:
            instance.coding_questions.filter(id__in=questions_to_delete).delete()


class InterviewSerializer(serializers.ModelSerializer):
    has_applied = serializers.SerializerMethodField()
    application_status = serializers.SerializerMethodField()
    attempted = serializers.SerializerMethodField()
    final_decision = serializers.SerializerMethodField()
    final_feedback = serializers.SerializerMethodField()
    match_score = serializers.SerializerMethodField()
    match_details = serializers.SerializerMethodField()
    
    class Meta:
        model = Custominterviews
        fields = [
            "id", "desc", "post", "experience", "submissionDeadline",
            "startTime", "endTime", "has_applied", "application_status", "attempted",
            "final_decision", "final_feedback", "match_score", "match_details"
        ]

    def get_match_score(self, obj):
        return getattr(obj, 'match_score', 0)

    def get_match_details(self, obj):
        return getattr(obj, 'match_details', {})

    def get_has_applied(self, obj):
        """
        Checks if the authenticated user has applied to this interview.
        """
        request = self.context.get("request")
        if request and hasattr(request, "user") and request.user.is_authenticated:
            return Application.objects.filter(
                user=request.user,
                interview=obj
            ).exists()
        return False
    
    def get_application_status(self, obj):
        """
        Returns the application status for the authenticated user.
        """
        request = self.context.get("request")
        if request and hasattr(request, "user") and request.user.is_authenticated:
            try:
                application = Application.objects.get(
                    user=request.user,
                    interview=obj
                )
                return application.approved
            except Application.DoesNotExist:
                return False
        return False
    
    def get_attempted(self, obj):
        """
        Checks if the authenticated user has attempted this interview.
        """
        request = self.context.get("request")
        if request and hasattr(request, "user") and request.user.is_authenticated:
            return InterviewSession.objects.filter(
                Application__user=request.user,
                Application__interview=obj
            ).exists()
        return False
    
    def get_final_decision(self, obj):
        """
        Returns the org's final decision for the authenticated user's application.
        """
        request = self.context.get("request")
        if request and hasattr(request, "user") and request.user.is_authenticated:
            try:
                application = Application.objects.get(
                    user=request.user,
                    interview=obj
                )
                return application.final_decision
            except Application.DoesNotExist:
                return None
        return None
    
    def get_final_feedback(self, obj):
        """
        Returns the org's feedback for the authenticated user's application.
        """
        request = self.context.get("request")
        if request and hasattr(request, "user") and request.user.is_authenticated:
            try:
                application = Application.objects.get(
                    user=request.user,
                    interview=obj
                )
                return application.final_feedback
            except Application.DoesNotExist:
                return None
        return None

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username"]

class ApplicationSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = Application
        fields = [
            "id",
            "user",
            "interview",
            "approved",
            "resume",
            "applied_at",
            "extratedResume",
            "score",
            "shortlisting_decision",
            "feedback",
            "final_decision",
            "final_feedback"
        ]
        read_only_fields = [
            "id",
            "user",
            "interview",
            "applied_at",
            "extratedResume",
            "score",
            "approved",
            "shortlisting_decision",
            "feedback"
        ]

    def create(self, validated_data):
        return Application.objects.create(**validated_data)
    
    def update(self, instance, validated_data):
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance

class FollowUpSerializer(serializers.ModelSerializer):
    class Meta:
        model = FollowUpQuestions
        fields = ["question","answer"]  # Fixed typo: was "fileds"

class DsaSessionSerializer(serializers.ModelSerializer):
    topic = DsaTopicSerializer(read_only=True)

    class Meta:
        model = DSAInteractions
        fields = ["id", "session", "topic", "question", "code", "score", "created_at"]
        read_only_fields = ["id", "created_at"]

class CodingSessionSerializer(serializers.ModelSerializer):
    question = CodingQuestionSerializer(read_only=True)

    class Meta:
        model = CodingInteraction
        fields = ["id", "session", "question", "code", "score", "feedback", "assistance_count", "created_at"]
        read_only_fields = ["id", "created_at"]

class InteractionSerializer(serializers.ModelSerializer):
    Customquestion = CustomQuestionSerializer()  # Fixed: was "CustomQuestion"
    followups = FollowUpSerializer(many=True, source='interaction')
    class Meta:
        model = Interaction
        fields = ["Customquestion","followups","score","feedback"]  # Fixed field name

class InterviewSessionSerializer(serializers.ModelSerializer):
    has_coding_round = serializers.BooleanField(source='Application.interview.has_coding_round', read_only=True)
    interview_id = serializers.IntegerField(source='Application.interview.id', read_only=True)

    class Meta:
        model = InterviewSession
        fields = ["id", "status", "has_coding_round", "interview_id"]

# New serializer for resumeconvo model
class ResumeConvoSerializer(serializers.ModelSerializer):
    class Meta:
        model = resumeconvo
        fields = ["id", "question", "expected_answer", "answer", "score", "feedback"]
        read_only_fields = ["id"]
class InterviewImagesSerializer(serializers.ModelSerializer):
    class Meta:
        model = InterviewImages
        fields = ["id", "image_url", "uploaded_at"]
        read_only_fields = ["id", "uploaded_at"]
class LeaderBoardSerializer(serializers.ModelSerializer):
    Application = ApplicationSerializer(read_only=True)
    user = UserSerializer(read_only=True)
    session = InteractionSerializer(many=True)  # Fixed: should be many=True for related_name="session"
    dsa = DsaSessionSerializer(many=True, source='dsa_sessions')
    resume_conversations = ResumeConvoSerializer(many=True, source='interview_session')  # Add resume conversations
    coding_sessions = CodingSessionSerializer(many=True)
    images = InterviewImagesSerializer(many=True)  # Add images
    class Meta:
        model = InterviewSession
        fields = [
            "id",
            "start_time",
            "end_time",
            "status",
            "feedback",
            "Devscore",
            "Resumescore",
            "confidenceScore",
            "DsaScore",
            "CodingScore",
            "recommendation",
            "strengths",
            "Application",
            "user",
            "session",
            "dsa",
            "coding_sessions",
            "resume_conversations",  # Add the new field
            "images",
        ]

class DSAQuestionsSerializer(serializers.ModelSerializer):
    class Meta:
        model = DsaTopics
        fields = ["id","topic", "difficulty", "number_of_questions"]