from __future__ import annotations

from sqlalchemy.orm import Session, joinedload

from app.models import AdminLog, SiteFAQItem, SiteSettings, User
from app.schemas import SiteContentResponse, SiteContentUpdate, SiteFAQItemResponse


DEFAULT_SETTINGS_ID = 1


def _clean_optional(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    return cleaned or None


def _get_settings(db: Session) -> SiteSettings:
    settings = (
        db.query(SiteSettings)
        .options(joinedload(SiteSettings.faq_items))
        .filter(SiteSettings.id == DEFAULT_SETTINGS_ID)
        .first()
    )
    if settings is not None:
        return settings

    settings = SiteSettings(
        id=DEFAULT_SETTINGS_ID,
        contact_title="Связаться с Resonans Sound",
        contact_email="hello@resonance-sound.ru",
        contact_telegram="@resonance_sound",
        contact_website="https://resonance-sound.ru",
        footer_note="Платформа для независимых артистов: быстрая публикация, живой каталог и ручные подборки администрации.",
    )
    db.add(settings)
    db.commit()
    db.refresh(settings)
    return settings


def serialize_site_content(settings: SiteSettings, *, public_only: bool) -> SiteContentResponse:
    faq_items = sorted(
        [item for item in settings.faq_items if item.is_active or not public_only],
        key=lambda item: (item.sort_order, item.id),
    )
    return SiteContentResponse(
        contact_title=settings.contact_title,
        contact_email=settings.contact_email,
        contact_telegram=settings.contact_telegram,
        contact_phone=settings.contact_phone,
        contact_website=settings.contact_website,
        footer_note=settings.footer_note,
        faq_items=[SiteFAQItemResponse.model_validate(item) for item in faq_items],
        updated_at=settings.updated_at,
    )


def get_public_site_content(db: Session) -> SiteContentResponse:
    return serialize_site_content(_get_settings(db), public_only=True)


def get_admin_site_content(db: Session) -> SiteContentResponse:
    return serialize_site_content(_get_settings(db), public_only=False)


def update_site_content(db: Session, admin_user: User, payload: SiteContentUpdate) -> SiteContentResponse:
    settings = _get_settings(db)
    settings.contact_title = payload.contact_title.strip()
    settings.contact_email = _clean_optional(payload.contact_email)
    settings.contact_telegram = _clean_optional(payload.contact_telegram)
    settings.contact_phone = _clean_optional(payload.contact_phone)
    settings.contact_website = _clean_optional(payload.contact_website)
    settings.footer_note = _clean_optional(payload.footer_note)

    settings.faq_items.clear()
    for index, item in enumerate(payload.faq_items, start=1):
        settings.faq_items.append(
            SiteFAQItem(
                question=item.question.strip(),
                answer=item.answer.strip(),
                sort_order=item.sort_order if item.sort_order is not None else index,
                is_active=item.is_active,
            )
        )

    db.add(
        AdminLog(
            admin_id=admin_user.id,
            action="site_content_updated",
            target_type="site_content",
            target_id=settings.id,
            details={"faq_count": len(payload.faq_items)},
        )
    )
    db.add(settings)
    db.commit()
    db.refresh(settings)
    return get_admin_site_content(db)
