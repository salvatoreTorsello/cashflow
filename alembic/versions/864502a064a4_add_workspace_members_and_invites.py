"""add workspace members and invites

Revision ID: 864502a064a4
Revises: 0d583c65dcf6
Create Date: 2026-08-03 02:41:41.786736

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '864502a064a4'
down_revision: Union[str, None] = '0d583c65dcf6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "workspace_members",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("workspace_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspaces.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("workspace_id", "user_id", name="uq_workspace_member"),
    )

    op.create_table(
        "workspace_invites",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("workspace_id", sa.Integer(), nullable=False),
        sa.Column("code_hash", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspaces.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_workspace_invites_code_hash", "workspace_invites", ["code_hash"], unique=True)

    # Every existing workspace was accessible only via owner_id — backfill an
    # explicit membership row for each owner so the new membership-based
    # authorization doesn't lock out any current user.
    op.execute(
        "INSERT INTO workspace_members (workspace_id, user_id, created_at) "
        "SELECT id, owner_id, created_at FROM workspaces"
    )


def downgrade() -> None:
    op.drop_index("ix_workspace_invites_code_hash", table_name="workspace_invites")
    op.drop_table("workspace_invites")
    op.drop_table("workspace_members")
