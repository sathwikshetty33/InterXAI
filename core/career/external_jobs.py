"""
External Job Search using Tavily API
Searches for job opportunities matching user's skills and target roles
"""
import os
import requests
from typing import List, Dict, Optional


class TavilyJobSearcher:
    """Search for external job opportunities using Tavily API"""
    
    def __init__(self):
        self.api_key = os.environ.get('TAVILY_API_KEY')
        self.base_url = "https://api.tavily.com/search"
    
    def search_jobs(self, skills: List[str], target_role: Optional[str] = None, 
                    experience_level: str = "entry", max_results: int = 10) -> Dict:
        """
        Search for jobs matching the given skills and role
        
        Args:
            skills: List of user's skills
            target_role: Desired job role (e.g., "Full Stack Developer")
            experience_level: Entry, mid, or senior level
            max_results: Maximum number of results to return
            
        Returns:
            Dict containing job listings and search metadata
        """
        if not self.api_key:
            return {
                "success": False,
                "error": "Tavily API key not configured",
                "jobs": []
            }
        
        # Build search query
        query = self._build_query(skills, target_role, experience_level)
        
        try:
            response = requests.post(
                self.base_url,
                json={
                    "api_key": self.api_key,
                    "query": query,
                    "search_depth": "advanced",
                    "include_domains": [
                        "linkedin.com/jobs",
                        "indeed.com",
                        "glassdoor.com",
                        "wellfound.com",
                        "remoteok.com",
                        "weworkremotely.com",
                        "stackoverflow.com/jobs",
                        "github.com/jobs",
                        "lever.co",
                        "greenhouse.io",
                        "careers.google.com",
                        "amazon.jobs",
                        "microsoft.com/careers"
                    ],
                    "max_results": max_results
                },
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                jobs = self._parse_results(data.get('results', []), skills)
                
                return {
                    "success": True,
                    "jobs": jobs,
                    "search_query": query,
                    "total_results": len(jobs)
                }
            else:
                return {
                    "success": False,
                    "error": f"Tavily API error: {response.status_code}",
                    "jobs": []
                }
                
        except requests.exceptions.Timeout:
            return {
                "success": False,
                "error": "Search request timed out",
                "jobs": []
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "jobs": []
            }
    
    def _build_query(self, skills: List[str], target_role: Optional[str], 
                     experience_level: str) -> str:
        """Build an optimized search query for job listings"""
        parts = []
        
        # Add target role
        if target_role:
            parts.append(f"{target_role} jobs hiring now")
        else:
            parts.append("software developer jobs hiring")
        
        # Add top skills (limit to 3-4 for focused results)
        if skills:
            top_skills = skills[:4]
            parts.append(" ".join(top_skills))
        
        # Add experience level
        level_map = {
            "entry": "entry level junior",
            "mid": "mid level",
            "senior": "senior lead"
        }
        parts.append(level_map.get(experience_level, ""))
        
        # Add job posting age preference
        parts.append("2024 2025")
        
        return " ".join(parts).strip()
    
    def _parse_results(self, results: List[Dict], user_skills: List[str]) -> List[Dict]:
        """Parse and enrich Tavily results with skill matching"""
        jobs = []
        
        for result in results:
            title = result.get('title', '')
            url = result.get('url', '')
            content = result.get('content', '')
            
            # Skip non-job results
            if not self._is_job_listing(title, url):
                continue
            
            # Find matching skills in the job description
            matched_skills = self._find_matching_skills(content, user_skills)
            
            # Extract source from URL
            source = self._extract_source(url)
            
            jobs.append({
                "title": self._clean_title(title),
                "url": url,
                "source": source,
                "snippet": content[:250] + "..." if len(content) > 250 else content,
                "skills_matched": matched_skills,
                "match_score": len(matched_skills) / max(len(user_skills), 1) * 100
            })
        
        # Sort by match score
        jobs.sort(key=lambda x: x['match_score'], reverse=True)
        
        return jobs
    
    def _is_job_listing(self, title: str, url: str) -> bool:
        """Check if the result is likely a job listing"""
        job_indicators = ['job', 'career', 'hiring', 'position', 'role', 'opportunity',
                         'developer', 'engineer', 'designer', 'manager', 'analyst']
        title_lower = title.lower()
        
        # Check title for job-related words
        for indicator in job_indicators:
            if indicator in title_lower:
                return True
        
        # Check URL for job platforms
        job_domains = ['linkedin.com/jobs', 'indeed.com', 'glassdoor.com', 
                       'lever.co', 'greenhouse.io', 'wellfound.com', 'careers']
        for domain in job_domains:
            if domain in url.lower():
                return True
        
        return False
    
    def _find_matching_skills(self, content: str, user_skills: List[str]) -> List[str]:
        """Find which user skills are mentioned in the job description"""
        content_lower = content.lower()
        matched = []
        
        for skill in user_skills:
            skill_lower = skill.lower()
            # Check for exact or partial match
            if skill_lower in content_lower:
                matched.append(skill)
        
        return matched
    
    def _extract_source(self, url: str) -> str:
        """Extract the platform name from URL"""
        url_lower = url.lower()
        
        source_map = {
            'linkedin.com': 'LinkedIn',
            'indeed.com': 'Indeed',
            'glassdoor.com': 'Glassdoor',
            'wellfound.com': 'Wellfound',
            'remoteok.com': 'RemoteOK',
            'weworkremotely.com': 'WeWorkRemotely',
            'stackoverflow.com': 'Stack Overflow',
            'github.com': 'GitHub',
            'lever.co': 'Lever',
            'greenhouse.io': 'Greenhouse',
            'google.com': 'Google Careers',
            'amazon.jobs': 'Amazon Jobs',
            'microsoft.com': 'Microsoft Careers'
        }
        
        for domain, name in source_map.items():
            if domain in url_lower:
                return name
        
        return 'Web'
    
    def _clean_title(self, title: str) -> str:
        """Clean up job title by removing common suffixes"""
        # Remove common suffixes
        suffixes = [' | LinkedIn', ' - Indeed', ' | Glassdoor', ' - Wellfound']
        
        for suffix in suffixes:
            if title.endswith(suffix):
                title = title[:-len(suffix)]
        
        return title.strip()
