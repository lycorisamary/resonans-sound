from datetime import datetime, timezone
from types import SimpleNamespace

import pytest

from app.schemas import SiteContentUpdate
from app.services.site_content import serialize_site_content


def make_faq_item(item_id: int, question: str, is_active: bool, sort_order: int):
    return SimpleNamespace(
        id=item_id,
        question=question,
        answer=f"Answer {item_id}",
        is_active=is_active,
        sort_order=sort_order,
    )


def test_public_site_content_hides_inactive_faq_items():
    settings = SimpleNamespace(
        contact_title="Contact",
        contact_email="hello@example.com",
        contact_telegram="@resonance",
        contact_phone=None,
        contact_website="https://example.com",
        footer_note="Footer text",
        updated_at=datetime.now(timezone.utc),
        faq_items=[
            make_faq_item(1, "Hidden", False, 1),
            make_faq_item(2, "Visible", True, 2),
        ],
    )

    response = serialize_site_content(settings, public_only=True)

    assert [item.question for item in response.faq_items] == ["Visible"]


def test_site_content_payload_rejects_invalid_website():
    with pytest.raises(ValueError, match="contact_website"):
        SiteContentUpdate(
            contact_title="Contact",
            contact_website="example.com",
            faq_items=[],
        )
