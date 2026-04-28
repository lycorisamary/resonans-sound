from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.session import Base


class SiteSettings(Base):
    __tablename__ = "site_settings"

    id = Column(Integer, primary_key=True)
    contact_title = Column(String(120), nullable=False)
    contact_email = Column(String(255))
    contact_telegram = Column(String(120))
    contact_phone = Column(String(80))
    contact_website = Column(String(500))
    footer_note = Column(Text)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    faq_items = relationship(
        "SiteFAQItem",
        back_populates="settings",
        cascade="all, delete-orphan",
        order_by="SiteFAQItem.sort_order",
    )


class SiteFAQItem(Base):
    __tablename__ = "site_faq_items"

    id = Column(Integer, primary_key=True, index=True)
    settings_id = Column(Integer, ForeignKey("site_settings.id", ondelete="CASCADE"), nullable=False, index=True)
    question = Column(String(255), nullable=False)
    answer = Column(Text, nullable=False)
    sort_order = Column(Integer, nullable=False, default=0)
    is_active = Column(Boolean, nullable=False, default=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    settings = relationship("SiteSettings", back_populates="faq_items")
