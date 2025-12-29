from django.db import models
from django.contrib.auth.models import User


class RejectionFeedback(models.Model):
    """Captured rejection feedback from applications and interviews"""
    FEEDBACK_TYPE_CHOICES = [
        ('resume_rejection', 'Resume Rejection'),
        ('interview_rejection', 'Interview Rejection'),
        ('offer_declined', 'Offer Declined'),
        ('application_expired', 'Application Expired'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='rejection_feedbacks')
    application = models.ForeignKey(
        'opportunities.Application', 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True,
        related_name='rejection_feedbacks'
    )
    interview_session = models.ForeignKey(
        'interview.InterviewSession', 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True,
        related_name='rejection_feedbacks'
    )
    feedback_type = models.CharField(max_length=30, choices=FEEDBACK_TYPE_CHOICES)
    raw_feedback = models.TextField(blank=True)  # Original feedback if provided by employer
    ai_analyzed_feedback = models.JSONField(default=dict)  # {reasons: [], skill_gaps: [], suggestions: []}
    severity = models.CharField(max_length=20, default='medium')  # low, medium, high
    is_processed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.user.username} - {self.feedback_type}'

    class Meta:
        verbose_name = 'Rejection Feedback'
        verbose_name_plural = 'Rejection Feedbacks'
        ordering = ['-created_at']


class FeedbackInsight(models.Model):
    """AI-generated insights from feedback patterns"""
    INSIGHT_TYPE_CHOICES = [
        ('skill_gap', 'Skill Gap'),
        ('communication', 'Communication Issue'),
        ('experience', 'Experience Mismatch'),
        ('technical', 'Technical Weakness'),
        ('behavioral', 'Behavioral Concern'),
        ('resume', 'Resume Quality'),
        ('interview', 'Interview Performance'),
    ]
    PRIORITY_CHOICES = [
        ('critical', 'Critical'),
        ('high', 'High'),
        ('medium', 'Medium'),
        ('low', 'Low'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='feedback_insights')
    insight_type = models.CharField(max_length=30, choices=INSIGHT_TYPE_CHOICES)
    title = models.CharField(max_length=200)
    pattern_description = models.TextField()  # Description of the pattern found
    occurrences = models.IntegerField(default=1)  # How many times this issue appeared
    source_feedbacks = models.ManyToManyField(RejectionFeedback, related_name='insights')
    recommended_actions = models.JSONField(default=list)  # [{action, resource_url, priority}]
    related_skills = models.JSONField(default=list)  # Skills related to this insight
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='medium')
    addressed = models.BooleanField(default=False)
    addressed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'{self.user.username} - {self.title}'

    class Meta:
        verbose_name = 'Feedback Insight'
        verbose_name_plural = 'Feedback Insights'
        ordering = ['-priority', '-occurrences']


class SkillProgress(models.Model):
    """Track skill improvement over time"""
    LEVEL_CHOICES = [
        ('novice', 'Novice'),
        ('beginner', 'Beginner'),
        ('intermediate', 'Intermediate'),
        ('advanced', 'Advanced'),
        ('expert', 'Expert'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='skill_progress')
    skill = models.CharField(max_length=100)
    progress_history = models.JSONField(default=list)  # [{date, score, source, note}]
    current_score = models.FloatField(default=0)  # 0-100
    current_level = models.CharField(max_length=20, choices=LEVEL_CHOICES, default='novice')
    target_level = models.CharField(max_length=20, choices=LEVEL_CHOICES, default='intermediate')
    target_score = models.FloatField(default=70)
    improvement_rate = models.FloatField(default=0)  # Points per week
    last_assessment_source = models.CharField(max_length=50, blank=True)  # mock_interview, resume, etc.
    last_updated = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.user.username} - {self.skill}'

    class Meta:
        verbose_name = 'Skill Progress'
        verbose_name_plural = 'Skill Progress Records'
        unique_together = ['user', 'skill']
        ordering = ['skill']


class ReadinessAssessment(models.Model):
    """Pre-application readiness check for a target role"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='readiness_assessments')
    target_role = models.CharField(max_length=100)
    overall_readiness_score = models.FloatField()  # 0-100
    skill_scores = models.JSONField(default=dict)  # {skill_name: score}
    recommended_improvements = models.JSONField(default=list)  # [{skill, current, required, gap}]
    mock_interviews_completed = models.IntegerField(default=0)
    mock_interview_avg_score = models.FloatField(null=True, blank=True)
    ready_to_apply = models.BooleanField(default=False)
    ai_recommendation = models.TextField(blank=True)
    assessed_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.user.username} - {self.target_role} Readiness ({self.overall_readiness_score}%)'

    class Meta:
        verbose_name = 'Readiness Assessment'
        verbose_name_plural = 'Readiness Assessments'
        ordering = ['-assessed_at']


class FeedbackActionLog(models.Model):
    """Log of actions taken based on feedback insights"""
    ACTION_TYPE_CHOICES = [
        ('roadmap_update', 'Roadmap Updated'),
        ('resource_assigned', 'Resource Assigned'),
        ('mock_interview_scheduled', 'Mock Interview Scheduled'),
        ('skill_target_updated', 'Skill Target Updated'),
        ('insight_addressed', 'Insight Addressed'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='feedback_action_logs')
    insight = models.ForeignKey(FeedbackInsight, on_delete=models.SET_NULL, null=True, blank=True)
    action_type = models.CharField(max_length=30, choices=ACTION_TYPE_CHOICES)
    action_description = models.TextField()
    automated = models.BooleanField(default=True)  # True if AI took action
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.user.username} - {self.action_type}'

    class Meta:
        verbose_name = 'Feedback Action Log'
        verbose_name_plural = 'Feedback Action Logs'
        ordering = ['-created_at']
