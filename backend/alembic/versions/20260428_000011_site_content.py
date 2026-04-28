"""Add editable site footer and FAQ content.

Revision ID: 20260428_000011
Revises: 20260422_000010
Create Date: 2026-04-28 21:20:00
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op


revision = "20260428_000011"
down_revision = "20260422_000010"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "site_settings",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("contact_title", sa.String(length=120), nullable=False),
        sa.Column("contact_email", sa.String(length=255), nullable=True),
        sa.Column("contact_telegram", sa.String(length=120), nullable=True),
        sa.Column("contact_phone", sa.String(length=80), nullable=True),
        sa.Column("contact_website", sa.String(length=500), nullable=True),
        sa.Column("footer_note", sa.Text(), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "site_faq_items",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("settings_id", sa.Integer(), nullable=False),
        sa.Column("question", sa.String(length=255), nullable=False),
        sa.Column("answer", sa.Text(), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.ForeignKeyConstraint(["settings_id"], ["site_settings.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_site_faq_items_id", "site_faq_items", ["id"], unique=False)
    op.create_index("ix_site_faq_items_is_active", "site_faq_items", ["is_active"], unique=False)
    op.create_index("ix_site_faq_items_settings_id", "site_faq_items", ["settings_id"], unique=False)

    op.execute(
        """
        INSERT INTO site_settings (
            id,
            contact_title,
            contact_email,
            contact_telegram,
            contact_phone,
            contact_website,
            footer_note
        )
        VALUES (
            1,
            'Связаться с Resonans Sound',
            'hello@resonance-sound.ru',
            '@resonance_sound',
            NULL,
            'https://resonance-sound.ru',
            'Платформа для независимых артистов: быстрая публикация, живой каталог и ручные подборки администрации.'
        )
        """
    )
    op.bulk_insert(
        sa.table(
            "site_faq_items",
            sa.column("settings_id", sa.Integer),
            sa.column("question", sa.String),
            sa.column("answer", sa.Text),
            sa.column("sort_order", sa.Integer),
            sa.column("is_active", sa.Boolean),
        ),
        [
            {
                "settings_id": 1,
                "question": "Как попасть в подборку?",
                "answer": "Загрузите трек и оформите профиль артиста. Администрация вручную смотрит свежие релизы и добавляет сильные работы в публичные подборки.",
                "sort_order": 1,
                "is_active": True,
            },
            {
                "settings_id": 1,
                "question": "Трек публикуется сразу?",
                "answer": "Да, после успешной обработки аудио трек становится доступен в каталоге и профиле артиста без премодерации.",
                "sort_order": 2,
                "is_active": True,
            },
            {
                "settings_id": 1,
                "question": "Куда писать по вопросам сотрудничества?",
                "answer": "Используйте контакты в футере. Их можно менять из административной панели без деплоя.",
                "sort_order": 3,
                "is_active": True,
            },
        ],
    )


def downgrade() -> None:
    op.drop_index("ix_site_faq_items_settings_id", table_name="site_faq_items")
    op.drop_index("ix_site_faq_items_is_active", table_name="site_faq_items")
    op.drop_index("ix_site_faq_items_id", table_name="site_faq_items")
    op.drop_table("site_faq_items")
    op.drop_table("site_settings")
