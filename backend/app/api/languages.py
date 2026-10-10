from fastapi import APIRouter
from typing import List
from app.schemas import LanguageMeta
from app.services.language_catalog import get_all_languages

router = APIRouter(prefix="/api/languages", tags=["Languages"])

@router.get("", response_model=List[LanguageMeta])
def get_languages():
    """Returns the comprehensive catalog of 80+ living languages with BCP47/ISO attributes."""
    return get_all_languages()
