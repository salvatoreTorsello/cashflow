"""add users sessions workspaces and workspace scoping

Revision ID: 9613a28220f5
Revises: 08ed8376f1a1
Create Date: 2026-08-02 14:11:52.587820

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "9613a28220f5"
down_revision: Union[str, None] = "08ed8376f1a1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("hashed_password", sa.String(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "workspaces",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("owner_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("owner_id", "name", name="uq_workspace_owner_name"),
    )

    op.create_table(
        "sessions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("token_hash", sa.String(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
            nullable=False,
        ),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_sessions_token_hash", "sessions", ["token_hash"], unique=True
    )

    # Pre-multi-tenancy rows have no owner to assign them to — this app has no
    # production users yet, so clear them rather than inventing a fake owner.
    op.execute("DELETE FROM transactions")
    op.execute("DELETE FROM commitments")
    op.execute("DELETE FROM categories")

    op.drop_constraint("categories_name_key", "categories", type_="unique")

    op.add_column(
        "categories", sa.Column("workspace_id", sa.Integer(), nullable=False)
    )
    op.create_foreign_key(
        "categories_workspace_id_fkey",
        "categories",
        "workspaces",
        ["workspace_id"],
        ["id"],
    )
    op.create_unique_constraint(
        "uq_category_workspace_name", "categories", ["workspace_id", "name"]
    )

    op.add_column(
        "transactions", sa.Column("workspace_id", sa.Integer(), nullable=False)
    )
    op.create_foreign_key(
        "transactions_workspace_id_fkey",
        "transactions",
        "workspaces",
        ["workspace_id"],
        ["id"],
    )

    op.add_column(
        "commitments", sa.Column("workspace_id", sa.Integer(), nullable=False)
    )
    op.create_foreign_key(
        "commitments_workspace_id_fkey",
        "commitments",
        "workspaces",
        ["workspace_id"],
        ["id"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "commitments_workspace_id_fkey", "commitments", type_="foreignkey"
    )
    op.drop_column("commitments", "workspace_id")

    op.drop_constraint(
        "transactions_workspace_id_fkey", "transactions", type_="foreignkey"
    )
    op.drop_column("transactions", "workspace_id")

    op.drop_constraint(
        "uq_category_workspace_name", "categories", type_="unique"
    )
    op.drop_constraint(
        "categories_workspace_id_fkey", "categories", type_="foreignkey"
    )
    op.drop_column("categories", "workspace_id")
    op.create_unique_constraint("categories_name_key", "categories", ["name"])

    op.drop_index("ix_sessions_token_hash", table_name="sessions")
    op.drop_table("sessions")

    op.drop_table("workspaces")

    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
