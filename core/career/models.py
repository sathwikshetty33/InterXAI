from django.db import models
from django.contrib.auth.models import User


class UserSkillProfile(models.Model):
    """Extended profile for skill tracking and career development"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='skill_profile')
    skills = models.JSONField(default=list)  # [{"skill": "Python", "level": "advanced", "verified": true, "source": "resume"}]
    interests = models.JSONField(default=list)  # Career interests/domains
    target_roles = models.JSONField(default=list)  # Desired positions
    experience_years = models.IntegerField(default=0)
    education = models.JSONField(default=dict)  # {"degree": "", "field": "", "institution": "", "year": ""}
    certifications = models.JSONField(default=list)  # List of certifications
    github_username = models.CharField(max_length=100, blank=True, null=True)
    leetcode_username = models.CharField(max_length=100, blank=True, null=True)
    linkedin_url = models.URLField(blank=True, null=True)
    last_profile_scan = models.DateTimeField(null=True, blank=True)
    profile_completeness = models.IntegerField(default=0)  # 0-100 percentage
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'{self.user.username} - Skill Profile'

    class Meta:
        verbose_name = 'User Skill Profile'
        verbose_name_plural = 'User Skill Profiles'


class MarketTrend(models.Model):
    """Cached market trend data for skills and roles"""
    TREND_SOURCES = [
        ('ai_generated', 'AI Generated'),
        ('linkedin', 'LinkedIn'),
        ('indeed', 'Indeed'),
        ('glassdoor', 'Glassdoor'),
    ]
    
    skill_category = models.CharField(max_length=100)
    trend_data = models.JSONField()  # {demand_score, growth_rate, avg_salary, top_companies, job_count}
    region = models.CharField(max_length=50, default="global")
    fetched_at = models.DateTimeField(auto_now=True)
    source = models.CharField(max_length=50, choices=TREND_SOURCES, default='ai_generated')
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f'{self.skill_category} - {self.region}'

    class Meta:
        verbose_name = 'Market Trend'
        verbose_name_plural = 'Market Trends'
        unique_together = ['skill_category', 'region', 'source']


class LearningRoadmap(models.Model):
    """Personalized learning roadmap for career development"""
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('completed', 'Completed'),
        ('paused', 'Paused'),
        ('abandoned', 'Abandoned'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='roadmaps')
    target_role = models.CharField(max_length=100)
    current_readiness_score = models.FloatField(default=0)  # 0-100
    target_readiness_score = models.FloatField(default=80)  # Target to achieve
    milestones = models.JSONField(default=list)  # [{title, skills, resources, deadline, status, progress}]
    skill_gaps = models.JSONField(default=list)  # Skills needed for target role
    ai_reasoning = models.TextField(blank=True)  # Why this roadmap was generated
    estimated_duration_weeks = models.IntegerField(default=12)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    generated_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'{self.user.username} - {self.target_role} Roadmap'

    class Meta:
        verbose_name = 'Learning Roadmap'
        verbose_name_plural = 'Learning Roadmaps'
        ordering = ['-generated_at']


class LearningResource(models.Model):
    """Curated learning resources for skill development"""
    TYPE_CHOICES = [
        ('course', 'Online Course'),
        ('tutorial', 'Tutorial'),
        ('project', 'Project'),
        ('book', 'Book'),
        ('article', 'Article'),
        ('video', 'Video'),
        ('practice', 'Practice Problems'),
    ]
    DIFFICULTY_CHOICES = [
        ('beginner', 'Beginner'),
        ('intermediate', 'Intermediate'),
        ('advanced', 'Advanced'),
    ]
    SOURCE_CHOICES = [
        ('coursera', 'Coursera'),
        ('udemy', 'Udemy'),
        ('youtube', 'YouTube'),
        ('leetcode', 'LeetCode'),
        ('github', 'GitHub'),
        ('medium', 'Medium'),
        ('official_docs', 'Official Docs'),
        ('other', 'Other'),
    ]
    
    title = models.CharField(max_length=200)
    url = models.URLField()
    description = models.TextField(blank=True)
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    skill_tags = models.JSONField(default=list)  # Skills this resource teaches
    difficulty = models.CharField(max_length=20, choices=DIFFICULTY_CHOICES)
    duration_hours = models.IntegerField(null=True, blank=True)
    source = models.CharField(max_length=50, choices=SOURCE_CHOICES)
    is_free = models.BooleanField(default=True)
    rating = models.FloatField(null=True, blank=True)  # 0-5
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title

    class Meta:
        verbose_name = 'Learning Resource'
        verbose_name_plural = 'Learning Resources'


class RoadmapProgress(models.Model):
    """Track progress on roadmap milestones"""
    roadmap = models.ForeignKey(LearningRoadmap, on_delete=models.CASCADE, related_name='progress_records')
    milestone_index = models.IntegerField()
    resource = models.ForeignKey(LearningResource, on_delete=models.SET_NULL, null=True, blank=True)
    status = models.CharField(max_length=20, default='pending')  # pending, in_progress, completed
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)

    def __str__(self):
        return f'{self.roadmap.user.username} - Milestone {self.milestone_index}'

    class Meta:
        verbose_name = 'Roadmap Progress'
        verbose_name_plural = 'Roadmap Progress Records'
