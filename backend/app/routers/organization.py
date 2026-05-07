from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.exceptions.common import NotFoundError
from app.logger import get_logger
from app.models.organization import Organization
from app.models.user import User
from app.schemas.organization import (
    OrganizationCreate,
    OrganizationResponse,
    OrganizationSignupResponse,
    OrganizationUpdate,
)
from app.utils.authorization import get_current_user, verify_org_ownership
from app.utils.jwt_auth import JwtAuth

logger = get_logger(__name__)

router: APIRouter = APIRouter(prefix="/organizations", tags=["organizations"])


@router.post(
    "/signup",
    response_model=OrganizationSignupResponse,
    status_code=status.HTTP_201_CREATED,
)
async def signup_organization(
    data: OrganizationCreate,
    db: AsyncSession = Depends(get_db),
) -> OrganizationSignupResponse:
    """
    Organization signup endpoint.
    """
    logger.info("Organization signup request for: %s", data.username)

    auth = JwtAuth(db_session=db)

    user = await auth.create_organization(
        username=data.username,
        password=data.password,
        email=data.email,
    )

    token = await auth.generate_token(user)

    logger.info(
        "Organization created successfully: %s (id=%d)",
        data.username,
        user.id,
    )

    return OrganizationSignupResponse(
        organization=OrganizationResponse.model_validate(user.organization),
        access_token=token,
    )


@router.get("/{org_id}", response_model=OrganizationResponse)
async def get_organization(
    org_id: int,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_user),
) -> OrganizationResponse:
    """
    Get organization by organization ID endpoint.
    """
    logger.info("Get organization request for org id: %d", org_id)

    result = await db.execute(select(Organization).where(Organization.id == org_id))
    org = result.scalar_one_or_none()

    if not org:
        logger.warning("Organization not found: %d", org_id)
        raise NotFoundError("Organization not found")

    logger.info("Organization retrieved successfully: %d", org_id)
    return OrganizationResponse.model_validate(org)


@router.put("/{org_id}", response_model=OrganizationResponse)
async def update_organization(
    org_id: int,
    org_data: OrganizationUpdate,
    db: AsyncSession = Depends(get_db),
    org: Organization = Depends(verify_org_ownership),
) -> OrganizationResponse:
    """
    Update organization by organization ID endpoint.
    """
    logger.info("Update organization request for org id: %d", org_id)

    update_data = org_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if value is not None and hasattr(org, field):
            setattr(org, field, value)

    await db.commit()
    await db.refresh(org)

    logger.info("Organization updated successfully: %d", org_id)
    return OrganizationResponse.model_validate(org)


@router.delete("/{org_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_organization(
    org_id: int,
    db: AsyncSession = Depends(get_db),
    org: Organization = Depends(verify_org_ownership),
) -> None:
    """
    Delete organization by organization ID endpoint.
    """
    logger.info("Delete organization request for org id: %d", org_id)

    await db.delete(org)
    await db.commit()

    logger.info("Organization deleted successfully: %d", org_id)
