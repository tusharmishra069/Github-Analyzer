"""add jobs user_id

Revision ID: 20260317_0002
Revises: 20260316_0001
Create Date: 2026-03-17

"""
from alembic import op
import sqlalchemy as sa

revision = "20260317_0002"
down_revision = "20260316_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("jobs", sa.Column("user_id", sa.String(length=36), nullable=True))
    op.create_index("ix_jobs_user_id", "jobs", ["user_id"])
    op.create_foreign_key("fk_jobs_user_id", "jobs", "users", ["user_id"], ["id"], ondelete="SET NULL")


def downgrade() -> None:
    op.drop_constraint("fk_jobs_user_id", "jobs", type_="foreignkey")
    op.drop_index("ix_jobs_user_id", table_name="jobs")
    op.drop_column("jobs", "user_id")
