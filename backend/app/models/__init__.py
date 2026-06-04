"""Model package.

Importing every model module here guarantees that all SQLAlchemy mappers are
registered as soon as the `app.models` package is loaded. String-based
relationships (e.g. ``relationship("User")`` on ``Application``) are only
resolvable once the referenced class has been imported, and the taskiq worker's
import graph would otherwise only load the handful of models its tasks reference
directly — leaving classes like ``User`` unregistered and mapper configuration
failing with "failed to locate a name ('User')".
"""

from app.models import (
    application,
    dsa_question,
    interaction,
    interview,
    organization,
    user,
)

__all__ = [
    "application",
    "dsa_question",
    "interaction",
    "interview",
    "organization",
    "user",
]
