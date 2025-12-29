from django.db import models
from django.contrib.auth.models import User


class Opportunity(models.Model):
    """Job/internship/hackathon opportunities"""
    TYPE_CHOICES = [
        ('job', 'Job'),
        ('internship', 'Internship'),
        ('hackathon', 'Hackathon'),
        ('fellowship', 'Fellowship'),
        ('freelance', 'Freelance'),
    ]
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('expired', 'Expired'),
        ('filled', 'Filled'),
    ]
    EXPERIENCE_CHOICES = [
        ('entry', 'Entry Level (0-2 years)'),
        ('mid', 'Mid Level (2-5 years)'),
        ('senior', 'Senior Level (5+ years)'),
        ('any', 'Any Experience'),
    ]
    
    title = models.CharField(max_length=200)
    company = models.CharField(max_length=100)
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    description = models.TextField()
    requirements = models.JSONField(default=dict)  # {skills: [], experience: "", education: ""}
    responsibilities = models.JSONField(default=list)
    location = models.CharField(max_length=100)
    remote = models.BooleanField(default=False)
    hybrid = models.BooleanField(default=False)
    salary_min = models.IntegerField(null=True, blank=True)
    salary_max = models.IntegerField(null=True, blank=True)
    salary_currency = models.CharField(max_length=10, default='INR')
    experience_level = models.CharField(max_length=20, choices=EXPERIENCE_CHOICES, default='any')
    deadline = models.DateTimeField(null=True, blank=True)
    source_url = models.URLField()
    source_platform = models.CharField(max_length=50)  # linkedin, indeed, devpost, company_website
    company_logo = models.URLField(null=True, blank=True)
    company_size = models.CharField(max_length=50, blank=True)  # startup, mid, large
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'{self.title} at {self.company}'

    class Meta:
        verbose_name = 'Opportunity'
        verbose_name_plural = 'Opportunities'
        ordering = ['-created_at']


class OpportunityMatch(models.Model):
    """Matched opportunities for users with AI-generated scores"""
    STATUS_CHOICES = [
        ('new', 'New'),
        ('viewed', 'Viewed'),
        ('saved', 'Saved'),
        ('applied', 'Applied'),
        ('dismissed', 'Dismissed'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='opportunity_matches')
    opportunity = models.ForeignKey(Opportunity, on_delete=models.CASCADE, related_name='matches')
    match_score = models.FloatField()  # 0-100
    match_reasons = models.JSONField(default=list)  # Why this opportunity matches
    skill_gaps = models.JSONField(default=list)  # What skills user lacks for this role
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='new')
    ai_recommendation = models.TextField(blank=True)  # Personalized recommendation
    priority_rank = models.IntegerField(default=0)  # For sorting user's opportunities
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'{self.user.username} - {self.opportunity.title} ({self.match_score}%)'

    class Meta:
        verbose_name = 'Opportunity Match'
        verbose_name_plural = 'Opportunity Matches'
        unique_together = ['user', 'opportunity']
        ordering = ['-match_score']


class Application(models.Model):
    """Track applications submitted by users"""
    STATUS_CHOICES = [
        ('drafting', 'Drafting'),
        ('submitted', 'Submitted'),
        ('viewed', 'Viewed by Employer'),
        ('shortlisted', 'Shortlisted'),
        ('interview_scheduled', 'Interview Scheduled'),
        ('interviewed', 'Interviewed'),
        ('offer_received', 'Offer Received'),
        ('rejected', 'Rejected'),
        ('withdrawn', 'Withdrawn'),
        ('accepted', 'Offer Accepted'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='job_applications')
    opportunity = models.ForeignKey(Opportunity, on_delete=models.CASCADE, related_name='applications')
    match = models.ForeignKey(OpportunityMatch, on_delete=models.SET_NULL, null=True, blank=True)
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='drafting')
    cover_letter = models.TextField(blank=True)
    resume_used = models.URLField(null=True, blank=True)  # Link to resume version used
    auto_applied = models.BooleanField(default=False)  # True if AI applied automatically
    applied_at = models.DateTimeField(null=True, blank=True)
    response_received_at = models.DateTimeField(null=True, blank=True)
    response_content = models.TextField(blank=True)  # Feedback from company if any
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'{self.user.username} -> {self.opportunity.title}'

    class Meta:
        verbose_name = 'Application'
        verbose_name_plural = 'Applications'
        unique_together = ['user', 'opportunity']
        ordering = ['-applied_at']


class UserApplicationPreferences(models.Model):
    """User preferences for opportunity matching and auto-apply"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='application_preferences')
    auto_apply_enabled = models.BooleanField(default=False)
    min_match_score = models.IntegerField(default=80)  # Only show/apply if score >= this
    preferred_opportunity_types = models.JSONField(default=list)  # ['job', 'internship']
    preferred_locations = models.JSONField(default=list)
    open_to_remote = models.BooleanField(default=True)
    preferred_company_sizes = models.JSONField(default=list)  # ['startup', 'mid', 'large']
    excluded_companies = models.JSONField(default=list)
    min_salary = models.IntegerField(null=True, blank=True)
    max_applications_per_day = models.IntegerField(default=5)
    notification_frequency = models.CharField(max_length=20, default='daily')  # instant, daily, weekly
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'{self.user.username} - Application Preferences'

    class Meta:
        verbose_name = 'User Application Preference'
        verbose_name_plural = 'User Application Preferences'


class SavedOpportunity(models.Model):
    """Bookmarked opportunities for later"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='saved_opportunities')
    opportunity = models.ForeignKey(Opportunity, on_delete=models.CASCADE)
    notes = models.TextField(blank=True)
    saved_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.user.username} saved {self.opportunity.title}'

    class Meta:
        verbose_name = 'Saved Opportunity'
        verbose_name_plural = 'Saved Opportunities'
        unique_together = ['user', 'opportunity']
