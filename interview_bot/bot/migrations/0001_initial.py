# Generated by Django 5.1.4 on 2024-12-05 10:35

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='posts',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('post', models.CharField(default='Default Post Title', max_length=100)),
            ],
        ),
        migrations.CreateModel(
            name='conversation',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('time', models.DateTimeField(auto_now_add=True)),
                ('user', models.ForeignKey(default=1, on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
                ('post', models.ForeignKey(default=1, on_delete=django.db.models.deletion.CASCADE, to='bot.posts')),
            ],
        ),
        migrations.CreateModel(
            name='questions',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('user', models.CharField(default='user', max_length=100)),
                ('question', models.TextField(default='Default question text')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('convo', models.ForeignKey(default=1, on_delete=django.db.models.deletion.CASCADE, to='bot.conversation')),
            ],
        ),
    ]
