"""add commitment series for periodic and installment commitments

Revision ID: 2eb3e0c20fcc
Revises: 9613a28220f5
Create Date: 2026-08-02 23:26:14.559437

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2eb3e0c20fcc'
down_revision: Union[str, None] = '9613a28220f5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "commitment_series",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("workspace_id", sa.Integer(), nullable=False),
        sa.Column(
            "type",
            sa.Enum("one_time", "periodic", "installment", name="commitmenttype"),
            nullable=False,
        ),
        sa.Column("interval_count", sa.Integer(), nullable=False),
        sa.Column(
            "interval_unit",
            sa.Enum("day", "week", "month", "year", name="intervalunit"),
            nullable=False,
        ),
        sa.Column("total_installments", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspaces.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.add_column("commitments", sa.Column("series_id", sa.Integer(), nullable=True))
    op.add_column("commitments", sa.Column("installment_number", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "commitments_series_id_fkey", "commitments", "commitment_series", ["series_id"], ["id"]
    )


def downgrade() -> None:
    op.drop_constraint("commitments_series_id_fkey", "commitments", type_="foreignkey")
    op.drop_column("commitments", "installment_number")
    op.drop_column("commitments", "series_id")

    op.drop_table("commitment_series")
    sa.Enum(name="commitmenttype").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="intervalunit").drop(op.get_bind(), checkfirst=True)
