from datetime import timezone

from django.contrib.auth.models import User
from django.db import models

class organization(models.Model):
    org = models.ForeignKey(User, on_delete=models.CASCADE, related_name='organization')
    orgname = models.CharField(max_length=100)
    address = models.TextField()
    email = models.EmailField(unique=True, blank=True, null=True)
    photo = models.CharField(null=True, blank=True, max_length=255)
    Description = models.TextField()
    is_central = models.BooleanField(default=False)  # True for CodeZero (visible to all)
    
    def __str__(self):
        return self.orgname


class OrgUsers(models.Model):
    """Students/Users belonging to an organization (college)"""
    org = models.ForeignKey(organization, on_delete=models.CASCADE, related_name='members')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='org_memberships')
    role = models.CharField(max_length=20, choices=[
        ('student', 'Student'),
        ('faculty', 'Faculty'),
    ], default='student')
    joined_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ('org', 'user')  # User can only join an org once
        verbose_name = 'Organization Member'
        verbose_name_plural = 'Organization Members'

    def __str__(self):
        return f'{self.user.username} - {self.org.orgname} ({self.role})'
