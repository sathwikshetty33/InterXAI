from pydantic import BaseModel, Field


class ResumeEvaluatorRequest(BaseModel):
    resume_text: str = Field(description="The full text of the candidate's resume")
    job_title: str = Field(description="The title of the job applied for")
    job_description: str = Field(description="The description of the job")
    experience: str = Field(description="The required years of experience")


class ResumeEvaluatorResponse(BaseModel):
    extracted_standardized_resume: str = Field(
        description="The standardized resume extracted from the resume text"
    )
    score: float = Field(
        description="The score of the extracted resume based on the job description"
    )
    shortlisting_decision: bool = Field(
        description="Decision on whether to shortlist the candidate based on the extracted resume and job description"
    )
    feedback: str = Field(description="Feedback on the extracted resume")
