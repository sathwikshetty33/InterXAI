"""
Tavily-powered Learning Resource Searcher
Finds real learning resources (courses, tutorials, documentation) for skills
"""
import os
import requests
from typing import List, Dict


class TavilyResourceSearcher:
    """Search for learning resources using Tavily API"""
    
    def __init__(self):
        self.api_key = os.environ.get('TAVILY_API_KEY')
        self.base_url = "https://api.tavily.com/search"
    
    def search_resources_for_skill(self, skill: str, max_results: int = 3) -> List[Dict]:
        """
        Search for learning resources for a specific skill
        
        Args:
            skill: The skill to find resources for (e.g., "React", "Python")
            max_results: Maximum number of resources to return
            
        Returns:
            List of resource objects with title, url, source, snippet
        """
        if not self.api_key:
            return self._get_fallback_resources(skill)
        
        query = f"{skill} tutorial course learn free 2024"
        
        try:
            response = requests.post(
                self.base_url,
                json={
                    "api_key": self.api_key,
                    "query": query,
                    "search_depth": "basic",
                    "include_domains": [
                        "youtube.com",
                        "udemy.com",
                        "coursera.org",
                        "freecodecamp.org",
                        "w3schools.com",
                        "developer.mozilla.org",
                        "docs.python.org",
                        "reactjs.org",
                        "nodejs.org",
                        "medium.com",
                        "dev.to",
                        "geeksforgeeks.org",
                        "tutorialspoint.com",
                        "kaggle.com",
                        "codecademy.com"
                    ],
                    "max_results": max_results + 2  # Get extra to filter
                },
                timeout=15
            )
            
            if response.status_code == 200:
                data = response.json()
                resources = []
                
                for result in data.get('results', [])[:max_results]:
                    resources.append({
                        "title": result.get('title', 'Learning Resource'),
                        "url": result.get('url', ''),
                        "source": self._extract_source(result.get('url', '')),
                        "snippet": result.get('content', '')[:150] + '...' if len(result.get('content', '')) > 150 else result.get('content', '')
                    })
                
                return resources if resources else self._get_fallback_resources(skill)
            else:
                return self._get_fallback_resources(skill)
                
        except Exception as e:
            print(f"Tavily resource search error: {e}")
            return self._get_fallback_resources(skill)
    
    def enrich_milestones_with_resources(self, milestones: List[Dict]) -> List[Dict]:
        """
        Add real learning resource URLs to roadmap milestones
        
        Args:
            milestones: List of milestone dicts from roadmap generation
            
        Returns:
            Milestones with enriched resources
        """
        enriched = []
        
        for milestone in milestones:
            # Get skills from milestone
            skills = milestone.get('skills', [])
            if not skills:
                # Try to extract from title
                skills = [milestone.get('title', 'programming')]
            
            # Search for resources for the first skill
            primary_skill = skills[0] if isinstance(skills, list) and skills else str(skills)
            resources = self.search_resources_for_skill(primary_skill, max_results=3)
            
            # Update milestone with real resources
            milestone['resources'] = resources
            enriched.append(milestone)
        
        return enriched
    
    def _extract_source(self, url: str) -> str:
        """Extract platform name from URL"""
        url_lower = url.lower()
        
        source_map = {
            'youtube.com': 'YouTube',
            'udemy.com': 'Udemy',
            'coursera.org': 'Coursera',
            'freecodecamp.org': 'freeCodeCamp',
            'w3schools.com': 'W3Schools',
            'developer.mozilla.org': 'MDN',
            'medium.com': 'Medium',
            'dev.to': 'Dev.to',
            'geeksforgeeks.org': 'GeeksForGeeks',
            'tutorialspoint.com': 'TutorialsPoint',
            'codecademy.com': 'Codecademy',
            'kaggle.com': 'Kaggle'
        }
        
        for domain, name in source_map.items():
            if domain in url_lower:
                return name
        
        return 'Web'
    
    def _get_fallback_resources(self, skill: str) -> List[Dict]:
        """Return fallback resources when Tavily is unavailable"""
        skill_lower = skill.lower()
        
        # Common skill resources
        fallback_map = {
            'python': [
                {"title": "Python Official Tutorial", "url": "https://docs.python.org/3/tutorial/", "source": "Python Docs"},
                {"title": "Learn Python - freeCodeCamp", "url": "https://www.freecodecamp.org/learn/scientific-computing-with-python/", "source": "freeCodeCamp"}
            ],
            'javascript': [
                {"title": "JavaScript Guide - MDN", "url": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide", "source": "MDN"},
                {"title": "JavaScript.info", "url": "https://javascript.info/", "source": "JavaScript.info"}
            ],
            'react': [
                {"title": "React Official Docs", "url": "https://react.dev/learn", "source": "React"},
                {"title": "React Tutorial - W3Schools", "url": "https://www.w3schools.com/react/", "source": "W3Schools"}
            ],
            'django': [
                {"title": "Django Official Tutorial", "url": "https://docs.djangoproject.com/en/stable/intro/tutorial01/", "source": "Django Docs"},
                {"title": "Django for Beginners", "url": "https://djangoforbeginners.com/", "source": "Django for Beginners"}
            ],
            'sql': [
                {"title": "SQL Tutorial - W3Schools", "url": "https://www.w3schools.com/sql/", "source": "W3Schools"},
                {"title": "SQLBolt - Interactive Tutorial", "url": "https://sqlbolt.com/", "source": "SQLBolt"}
            ],
            'git': [
                {"title": "Git Official Book", "url": "https://git-scm.com/book/en/v2", "source": "Git SCM"},
                {"title": "Learn Git Branching", "url": "https://learngitbranching.js.org/", "source": "Interactive"}
            ]
        }
        
        # Check for exact match
        if skill_lower in fallback_map:
            return fallback_map[skill_lower]
        
        # Check for partial match
        for key, resources in fallback_map.items():
            if key in skill_lower or skill_lower in key:
                return resources
        
        # Generic fallback
        return [
            {"title": f"Learn {skill} - Google Search", "url": f"https://www.google.com/search?q=learn+{skill.replace(' ', '+')}+tutorial", "source": "Google"},
            {"title": f"{skill} on YouTube", "url": f"https://www.youtube.com/results?search_query={skill.replace(' ', '+')}+tutorial", "source": "YouTube"}
        ]
